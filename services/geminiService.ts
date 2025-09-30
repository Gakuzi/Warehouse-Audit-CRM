
import { GoogleGenAI, Type } from "@google/genai";
import { Project, Week, Event } from '../types';

// Fix: Initialize the GoogleGenAI client according to the new guidelines.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateAuditPlan = async (
  projectName: string,
  projectDescription: string,
  startDate: string,
  endDate: string,
  durationInWeeks: number,
  approvalPeriod: string
): Promise<{ weeks: { title: string, plan: any, start_date: string, end_date: string }[] }> => {

  const prompt = `
    Создай детальный план аудита для проекта.
    Название проекта: "${projectName}"
    Описание/цели: "${projectDescription}"
    Даты проведения: с ${startDate} по ${endDate}.
    Общая продолжительность: ${durationInWeeks} недель.
    Период отчетности: ${approvalPeriod === 'weekly' ? 'Еженедельно' : 'Ежемесячно'}.

    План должен быть разбит на ${durationInWeeks} этапов (недель).
    Для каждого этапа (недели) придумай краткое, емкое название (например, "Этап 1: Сбор и анализ документации").
    Для каждого этапа (недели) определи точные даты начала и окончания, исходя из общей продолжительности и даты начала проекта. Первая неделя начинается ${startDate}. Каждая неделя длится 7 дней.
    Для каждого этапа (недели) составь ежедневный план задач. План должен быть в формате JSON объекта, где ключи - это даты в формате 'YYYY-MM-DD', а значения - это объекты с ключом 'tasks', содержащим массив задач на этот день.
    Задачи должны быть конкретными действиями, которые должен выполнить аудитор.
    Типы задач могут быть: 'task' (общая задача), 'meeting' (встреча), 'interview' (интервью), 'doc_review' (анализ документов), 'observation' (наблюдение).
    Для задач типа 'meeting' или 'interview' можно добавить поля 'time', 'location', 'agenda', 'participants', 'interviewee' в объект 'data'.
    Генерируй план на 5 рабочих дней в неделю (понедельник-пятница).
    Пример структуры задачи: { "id": "uuid", "content": "Запросить уставные документы", "completed": false, "type": "task" }
    
    Верни результат в формате JSON.
  `;
  
  // Fix: Defined a response schema to ensure structured JSON output from the model.
  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      weeks: {
        type: Type.ARRAY,
        description: 'Массив этапов (недель) аудита.',
        items: {
          type: Type.OBJECT,
          properties: {
            title: {
              type: Type.STRING,
              description: 'Название этапа (недели).',
            },
            start_date: {
                type: Type.STRING,
                description: 'Дата начала недели в формате YYYY-MM-DD.'
            },
            end_date: {
                type: Type.STRING,
                description: 'Дата окончания недели в формате YYYY-MM-DD.'
            },
            plan: {
              type: Type.OBJECT,
              description: 'Ежедневный план задач. Ключ - дата в формате YYYY-MM-DD.',
            },
          },
          required: ['title', 'plan', 'start_date', 'end_date'],
        },
      },
    },
    required: ['weeks'],
  };

  // Fix: Used the recommended ai.models.generateContent method.
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: responseSchema,
    },
  });
  
  try {
    // Fix: Extracted text directly from the `response.text` property.
    const jsonText = response.text.trim();
    const parsed = JSON.parse(jsonText);
    
    // Fix: Post-process the response to ensure all tasks have a valid client-generated UUID,
    // as the model may not generate them reliably.
    parsed.weeks.forEach((week: any) => {
        if (week.plan) {
            Object.values(week.plan).forEach((day: any) => {
                if (day.tasks && Array.isArray(day.tasks)) {
                    day.tasks.forEach((task: any) => {
                        task.id = crypto.randomUUID();
                    });
                }
            });
        }
    });

    return parsed;
  } catch (e) {
    console.error("Failed to parse Gemini response:", e);
    console.error("Raw response:", response.text);
    throw new Error("Не удалось сгенерировать план аудита. Ответ от AI имел неверный формат.");
  }
};


export const recognizeTextFromImage = async (base64ImageData: string): Promise<string> => {
  const imagePart = {
    inlineData: {
      mimeType: 'image/jpeg',
      data: base64ImageData,
    },
  };
  const textPart = {
    text: "Распознай и верни весь рукописный и печатный текст с этого изображения. Сохрани оригинальное форматирование, включая переносы строк и отступы, насколько это возможно. Верни только текст, без каких-либо дополнительных комментариев или пояснений.",
  };

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: { parts: [imagePart, textPart] },
  });

  return response.text;
};

export const processInterviewAudio = async (
  base64AudioData: string,
  mimeType: string,
  interviewContext: string
): Promise<string> => {
    // Note: The standard generateContent API does not support direct audio file inputs.
    // This function simulates the analysis by using a text prompt based on the interview context.
    // A production implementation would typically use a Speech-to-Text service first,
    // then send the resulting transcript to the Gemini API for analysis.

    const prompt = `
        Представь, что ты - ассистент аудитора. Тебе предоставлен контекст интервью.
        Твоя задача - проанализировать этот контекст и сгенерировать краткую сводку, основные выводы и ключевые моменты, которые могли бы обсуждаться.
        
        Контекст интервью: "${interviewContext}"
        
        Основываясь на контексте, напиши отчет, который мог бы получиться после анализа аудиозаписи.
        Отчет должен включать:
        1.  **Краткая сводка:** 1-2 предложения о теме разговора.
        2.  **Ключевые моменты:** Список из 3-5 самых важных тезисов или фактов, упомянутых в ходе интервью.
        3.  **Выводы и риски:** Какие выводы можно сделать? Есть ли какие-то потенциальные риски, о которых стоит упомянуть?
        4.  **Дальнейшие шаги:** Какие действия следует предпринять аудитору на основе этого интервью?

        Отформатируй ответ, используя markdown.
    `;
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
    });

    return response.text;
};

export const generateComprehensiveReport = async (week: Week, project: Project, events: Event[]): Promise<string> => {
    const allTasks = Object.values(week.plan).flatMap(day => day.tasks);
    const completedTasks = allTasks.filter(task => (task.event_count || 0) > 0);
    const inProgressTasks = allTasks.filter(task => !(task.event_count || 0 > 0));

    const prompt = `
    Ты — профессиональный бизнес-аудитор. Твоя задача — сгенерировать исчерпывающий отчет о ходе аудита за прошедший этап (неделю) для собственника бизнеса.
    Отчет должен быть структурированным, официальным, но при этом ясным и понятным. Используй Markdown для форматирования.

    **Входные данные для анализа:**

    1.  **Проект:**
        *   Название: "${project.name}"
        *   Цели: "${project.description}"

    2.  **Отчетный этап:**
        *   Название: "${week.title}"
        *   Даты: с ${week.start_date} по ${week.end_date}

    3.  **План на этап:**
        *   **Всего запланировано задач:** ${allTasks.length}
        *   **Выполненные задачи (по которым есть активность):** ${completedTasks.length}
        *   **Задачи в работе (без активности):** ${inProgressTasks.length}

    4.  **Журнал событий (комментарии, встречи, файлы):**
        *Проанализируй этот JSON массив событий, чтобы понять динамику работы, ключевые обсуждения, прикрепленные документы и результаты встреч.*
        \`\`\`json
        ${JSON.stringify(events.map(e => ({ type: e.type, content: e.content, author: e.author_email, date: e.created_at, files: e.data?.file_urls?.map(f => f.name) })), null, 2)}
        \`\`\`

    **ЗАДАЧА: Сформируй отчет, включающий следующие разделы:**

    ### 1. Общая сводка по этапу
    Начни с краткого резюме (2-3 предложения) о проделанной работе, общем прогрессе и достижении целей этапа. Оцени, насколько успешно прошел этап.

    ### 2. Ключевые результаты и выполненные работы
    *   Перечисли наиболее значимые **выполненные** задачи.
    *   Опиши главные результаты, полученные в ходе этапа. Что было выяснено, подтверждено или опровергнуто? Используй данные из журнала событий для конкретики.
    *   Если были встречи или интервью (события типа 'meeting' или 'interview'), кратко изложи их итоги на основе комментариев.
    *   Если были прикреплены документы (события 'documentation_review' или файлы в комментариях), упомяни, какие документы были проанализированы и какие выводы из этого следуют.

    ### 3. Выявленные трудности, риски и открытые вопросы
    *   Проанализируй комментарии и обсуждения. Есть ли признаки проблем, разногласий, нехватки информации?
    *   Опиши любые возникшие трудности (например, задержки в предоставлении данных, недоступность сотрудников).
    *   Сформулируй потенциальные риски для бизнеса, которые были выявлены на этом этапе.
    *   Перечисли задачи, которые все еще находятся в работе, и укажи, почему по ним пока нет результата.

    ### 4. Рекомендации и следующие шаги
    *   На основе анализа данных, дай 2-3 конкретные, действенные рекомендации для руководства.
    *   Кратко опиши, что планируется делать на следующем этапе аудита, чтобы логически продолжить начатую работу.

    Твой отчет должен быть убедительным и подкрепленным фактами из предоставленных данных.
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
    });

    return response.text;
}