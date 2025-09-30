import { GoogleGenAI, Type } from "@google/genai";

// Per guidelines, initialize with a named apiKey parameter from process.env.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

const generatePlanSchema = {
    type: Type.OBJECT,
    properties: {
        weeks: {
            type: Type.ARRAY,
            description: 'List of weekly audit plans.',
            items: {
                type: Type.OBJECT,
                properties: {
                    title: {
                        type: Type.STRING,
                        description: 'A descriptive title for the week\'s activities (e.g., "Week 1: Planning and Initial Assessment").',
                    },
                    days: {
                        type: Type.ARRAY,
                        description: 'A list of daily plans for the week. Only include weekdays (Monday to Friday).',
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                date: {
                                    type: Type.STRING,
                                    description: 'The date for the tasks in YYYY-MM-DD format.',
                                },
                                tasks: {
                                    type: Type.ARRAY,
                                    description: 'A list of tasks for the day. Each task should be a clear, actionable item.',
                                    items: {
                                        type: Type.OBJECT,
                                        properties: {
                                            content: {
                                                type: Type.STRING,
                                                description: 'The description of the task.',
                                            },
                                        },
                                        required: ['content'],
                                    },
                                },
                            },
                            required: ['date', 'tasks'],
                        },
                    },
                },
                required: ['title', 'days'],
            },
        },
    },
    required: ['weeks'],
};


export const generateAuditPlan = async (
    projectName: string,
    projectDescription: string,
    startDate: string,
    endDate: string | undefined,
    durationInWeeks: number,
    approvalPeriod: string
) => {

    const prompt = `
    Create a detailed audit plan for a project with the following details:
    - Project Name: "${projectName}"
    - Project Description/Goals: "${projectDescription}"
    - Start Date: ${startDate}
    - End Date: ${endDate || 'Not specified'}
    - Total Duration: ${durationInWeeks} weeks
    - Reporting Period: ${approvalPeriod}

    Instructions:
    1. Generate a week-by-week plan for the entire duration.
    2. For each week, provide a clear, concise title summarizing the main focus of that week.
    3. For each week, break down the plan into daily tasks from Monday to Friday.
    4. For each day, list specific, actionable tasks. Aim for 2-4 tasks per day.
    5. The tasks should be logical and follow a standard audit process (planning, fieldwork, reporting, etc.).
    6. Ensure the dates for each task are correct, starting from ${startDate} and only including weekdays.
    7. The final output must be a JSON object that strictly adheres to the provided schema. Do not include any text or markdown outside of the JSON object.
    `;

    try {
        // Use the 'gemini-2.5-flash' model as per guidelines
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: generatePlanSchema,
            },
        });

        // The response.text is the direct string output
        const jsonResponse = JSON.parse(response.text);

        // Transform the response to match the application's data structure
        const transformedData = {
            weeks: jsonResponse.weeks.map((week: any) => {
                const plan: { [date: string]: { tasks: any[] } } = {};
                let weekDates: string[] = [];
                week.days.forEach((day: any) => {
                    weekDates.push(day.date);
                    plan[day.date] = {
                        tasks: day.tasks.map((task: any) => ({
                            id: crypto.randomUUID(),
                            content: task.content,
                            completed: false,
                            type: 'task', // Default type for generated items
                        })),
                    };
                });

                const sortedDates = weekDates.sort();

                return {
                    title: week.title,
                    plan: plan,
                    start_date: sortedDates[0] || null,
                    end_date: sortedDates[sortedDates.length - 1] || null,
                };
            }),
        };

        return transformedData;

    } catch (error) {
        console.error("Error generating audit plan with Gemini:", error);
        throw new Error("Failed to generate audit plan. The AI model may be temporarily unavailable.");
    }
};

export const recognizeTextFromImage = async (base64ImageData: string): Promise<string> => {
    try {
        const imagePart = {
            inlineData: {
                mimeType: 'image/jpeg',
                data: base64ImageData,
            },
        };
        const textPart = {
            text: "Распознай рукописный текст на этом изображении. Выведи только распознанный текст, без лишних комментариев."
        };

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [imagePart, textPart] },
        });

        return response.text;
    } catch (error) {
        console.error("Error recognizing text from image:", error);
        throw new Error("Не удалось распознать текст на изображении.");
    }
};

export const processInterviewAudio = async (base64AudioData: string, mimeType: string, goal: string): Promise<string> => {
    try {
        const audioPart = {
            inlineData: {
                mimeType: mimeType,
                data: base64AudioData,
            },
        };
        const textPart = {
            text: `
            Пожалуйста, выполни две задачи для этой аудиозаписи интервью:
            1.  **Транскрибируй** весь разговор дословно.
            2.  **Напиши краткую сводку (summary)** ключевых моментов из транскрипции. В сводке сделай особый акцент на информации, которая относится к первоначальной цели интервью: "${goal}".

            Отформатируй ответ следующим образом:

            ### Транскрипция
            [Здесь дословная расшифровка аудио]

            ### Краткая сводка
            [Здесь краткое изложение ключевых моментов с акцентом на цель интервью]
            `
        };

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [audioPart, textPart] },
        });

        return response.text;
    } catch (error) {
        console.error("Error processing interview audio:", error);
        throw new Error("Не удалось обработать аудиозапись.");
    }
};