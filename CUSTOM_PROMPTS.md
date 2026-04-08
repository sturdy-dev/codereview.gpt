# Настройка промптов

## Обзор

Расширение **codereview.luminary** позволяет полностью настроить промпты для взаимодействия с AI. Это дает вам контроль над:

- Стилем ответов (формальный/неформальный, краткий/детальный)
- Языком ответов
- Фокусом анализа (безопасность, производительность, стиль и т.д.)
- Форматом вывода (bullet points, параграфы, таблицы)

## Типы промптов

### 1. Code Review Prompts

Используются для анализа Pull Requests и Merge Requests.

#### System Prompt
**Назначение:** Определяет роль и поведение AI  
**Дефолт:** `You are a programming code change reviewer, provide feedback on the code changes given. Do not introduce yourselves.`

**Пример кастомизации:**
```
You are a senior software engineer specializing in security and performance.
Review code changes with focus on potential vulnerabilities and optimization opportunities.
Be concise but thorough. Use professional tone.
```

#### Review Instructions Prompt
**Назначение:** Основные инструкции для code review  
**Переменные:** `{title}` - заголовок PR/MR

**Дефолт:**
```
The change has the following title: {title}.

Your task is:
- Review the code changes and provide feedback.
- If there are any bugs, highlight them.
- Provide details on missed use of best-practices.
- Does the code do what it says in the commit messages?
- Do not highlight minor issues and nitpicks.
- Use bullet points if you have multiple comments.
- Provide security recommendations if there are any.

You are provided with the code changes (diffs) in a unidiff format.
Do not provide feedback yet. I will follow-up with a description of the change in a new message.
```

**Пример для фокуса на производительности:**
```
Title: {title}

Focus Areas:
- Performance bottlenecks and optimization opportunities
- Memory leaks and resource management
- Algorithmic complexity (Big O notation)
- Database query optimization
- Caching strategies

Provide specific recommendations with code examples where applicable.
Wait for the full diff before responding.
```

#### Final Request Prompt
**Назначение:** Финальный запрос на подведение итогов

**Дефолт:** `All code changes have been provided. Please provide me with your code review based on all the changes, context & title provided. Provide response in Russian language.`

**Пример для English ответов:**
```
All changes provided. Generate comprehensive code review summary with:
1. Critical Issues (must fix before merge)
2. Recommendations (should fix)
3. Nice to Have (optional improvements)

Use English language. Be specific and actionable.
```

---

### 2. AI Explain Prompt

Используется для объяснения выделенного текста.

**Назначение:** Контролирует, как AI объясняет выделенный пользователем текст  
**Переменные:** 
- `{text}` - выделенный текст
- `{question}` - дополнительный вопрос пользователя

**Дефолт:**
```
Ты полезный AI ассистент. Твоя задача - объяснить выделенный текст понятно и на русском языке.

Выделенный текст:
{text}

{question}

Требования к ответу:
- Объясняй понятно и структурировано
- Используй примеры, где это уместно
- Если это код, объясни что он делает и как работает
- Если есть потенциальные проблемы или улучшения, укажи на них
- Отвечай на русском языке
- Будь кратким, но информативным
```

#### Примеры кастомизации

**Для начинающих (ELI5 - Explain Like I'm 5):**
```
You are a patient teacher explaining concepts to beginners.

Text to explain:
{text}

{question}

Your explanation should:
- Use simple, everyday language (avoid jargon)
- Include real-world analogies
- Break complex ideas into simple steps
- Assume no prior knowledge
- Be encouraging and supportive

Respond in Russian.
```

**Для экспертов (Technical Deep Dive):**
```
You are a technical expert providing in-depth analysis.

Code/Text:
{text}

{question}

Provide:
1. Technical explanation with proper terminology
2. Implementation details and edge cases
3. Performance characteristics (time/space complexity)
4. Common pitfalls and best practices
5. Alternative approaches with trade-offs

Use Russian. Be precise and comprehensive.
```

**Для изучения паттернов:**
```
Ты опытный архитектор ПО, специализирующийся на паттернах проектирования.

Анализируемый код:
{text}

{question}

В своем ответе укажи:
- Какие паттерны проектирования использованы
- Принципы SOLID (если применимо)
- Плюсы и минусы выбранного подхода
- Рекомендации по рефакторингу

Ответ на русском, с примерами кода.
```

**Для безопасности:**
```
You are a security expert analyzing code for vulnerabilities.

Code to analyze:
{text}

{question}

Security Analysis:
- Identify potential vulnerabilities (OWASP Top 10)
- Rate severity (Critical/High/Medium/Low)
- Provide mitigation strategies
- Suggest secure alternatives

Russian language. Include code examples.
```

---

## Как настроить промпты

### Шаг 1: Откройте настройки
1. Кликните правой кнопкой по иконке расширения
2. Выберите **"Параметры"** или **"Options"**

### Шаг 2: Найдите нужный промпт
Прокрутите страницу и найдите соответствующее текстовое поле:
- **System Prompt** - для роли AI
- **Review Instructions Prompt** - для code review инструкций
- **Final Request Prompt** - для финального запроса
- **AI Explain Prompt** - для объяснений текста

### Шаг 3: Отредактируйте промпт
- Введите свой кастомный промпт
- Используйте переменные `{title}`, `{text}`, `{question}` где нужно
- Сохраните изменения

### Шаг 4: Тестирование
- Попробуйте новый промпт на реальном примере
- При необходимости итеративно улучшайте
- Используйте кнопку **"Reset Prompts to Default"** для возврата к дефолтным значениям

---

## Переменные в промптах

| Переменная | Где доступна | Описание |
|------------|--------------|----------|
| `{title}` | Review Instructions Prompt | Заголовок PR/MR |
| `{text}` | AI Explain Prompt | Выделенный пользователем текст |
| `{question}` | AI Explain Prompt | Дополнительный вопрос пользователя |

### Пример использования переменных:

```
Analyzing PR: {title}

Selected code:
{text}

User asked: {question}

Provide detailed analysis considering the PR context and user's specific question.
```

---

## Советы по созданию промптов

### ✅ DO (Делайте)

1. **Будьте конкретны**
   ```
   ✅ "Identify SQL injection vulnerabilities and suggest parameterized queries"
   ❌ "Check for security issues"
   ```

2. **Структурируйте вывод**
   ```
   ✅ "Provide answer in 3 sections: 1) Summary 2) Details 3) Recommendations"
   ❌ "Explain this"
   ```

3. **Задайте тон и стиль**
   ```
   ✅ "Use professional but friendly tone. Be encouraging."
   ❌ (не указывать тон)
   ```

4. **Укажите формат**
   ```
   ✅ "Use bullet points for issues. Include code examples."
   ❌ (не указывать формат)
   ```

5. **Задайте язык явно**
   ```
   ✅ "Respond in Russian language."
   ❌ "Ответь по-русски" (внутри English промпта)
   ```

### ❌ DON'T (Не делайте)

1. **Не делайте промпт слишком длинным**
   - Оптимально: 100-300 слов
   - Избыточность снижает качество

2. **Не используйте противоречивые инструкции**
   ```
   ❌ "Be brief but provide detailed analysis with examples"
   ```

3. **Не забывайте про переменные**
   ```
   ❌ "Explain this code" (без {text})
   ✅ "Explain the following code:\n{text}"
   ```

4. **Не смешивайте языки без необходимости**
   ```
   ❌ "Explain код and provide recommendations"
   ✅ "Explain the code and provide recommendations"
   ```

---

## Примеры готовых промптов

### Для frontend разработки

```
You are a senior frontend developer specializing in React, performance, and UX.

Reviewing changes: {title}

Focus on:
- React best practices (hooks, component structure)
- Performance (unnecessary re-renders, bundle size)
- Accessibility (a11y, ARIA, keyboard navigation)
- CSS best practices and responsive design
- User experience considerations

Provide specific, actionable feedback with code examples.
```

### Для backend разработки

```
You are a backend architect with expertise in scalability and security.

PR Title: {title}

Analyze:
- API design (RESTful principles, versioning)
- Database queries (N+1 problems, indexes)
- Error handling and logging
- Security (authentication, authorization, input validation)
- Scalability concerns

Russian language. Be thorough but concise.
```

### Для изучения нового кода

```
Ты опытный разработчик, помогающий коллеге разобраться в новой кодовой базе.

Код для изучения:
{text}

Вопрос: {question}

Объясни:
1. Общая цель и контекст этого кода
2. Как это работает (шаг за шагом)
3. Важные детали и нюансы
4. Связь с другими частями системы (если очевидно)
5. Что может быть непонятно новичку

Используй аналогии и примеры. Будь дружелюбным и терпеливым.
```

---

## Сброс промптов

Если ваши кастомные промпты работают не так, как ожидалось:

1. Откройте **Options**
2. Нажмите кнопку **"Reset Prompts to Default"**
3. Нажмите **"Save"**
4. Все промпты вернутся к дефолтным значениям

---

## Лучшие практики

### 1. Итеративная разработка промптов
- Начните с дефолтного промпта
- Делайте небольшие изменения
- Тестируйте на реальных примерах
- Итеративно улучшайте

### 2. Версионирование промптов
Сохраняйте успешные версии промптов в отдельном файле:

```
# my-custom-prompts.txt

## Code Review Prompt v1.0
[ваш промпт]

## Code Review Prompt v2.0 (improved)
[улучшенная версия]
```

### 3. Шаблоны для разных задач
Создайте набор промптов для разных сценариев:
- Security review
- Performance review
- Architecture review
- Quick review (для небольших PR)

### 4. Тестирование
Тестируйте промпты на:
- Простых примерах
- Сложных примерах
- Граничных случаях
- Разных языках программирования

---

## FAQ

**Q: Сколько токенов занимает промпт?**  
A: Обычно 50-500 токенов в зависимости от длины. Оставьте место для кода и ответа.

**Q: Можно ли использовать emoji в промптах?**  
A: Да, но они могут по-разному интерпретироваться разными моделями.

**Q: Влияет ли промпт на скорость ответа?**  
A: Длинные промпты немного увеличивают latency, но эффект минимален.

**Q: Как изменить язык ответов?**  
A: Добавьте в промпт: "Respond in [English/Russian/Chinese] language."

**Q: Можно ли использовать markdown в промпте?**  
A: Да, markdown в промпте может улучшить структуру, но не гарантирует структуру ответа.

---

## Поддержка

Если у вас возникли вопросы по настройке промптов:
- Проверьте примеры в этом документе
- Начните с малых изменений дефолтных промптов
- Используйте "Reset to Default" если что-то пошло не так

**Приятной настройки! 🎨**
