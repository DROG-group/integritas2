const express = require('express');
const fetch = require('node-fetch');
const app = express();
app.use(express.json());

const PROMPT_A = `Question: {userInput} 
Answer: Let's work this out in a step by step way to be sure we have the right answer.`.replace(/\n/g, ' ');

const PROMPT_B = `You are a researcher tasked with investigating the three answer options provided. 
List the flaws and faulty logic of each answer option. 
Let's think step by step:`.replace(/\n/g, ' ');

const PROMPT_C = `You are a resolver tasked with 1) finding which of the answer options the researcher thought was best 
2) improving that answer, and 3) Printing the improved answer in full. 
Let's work this out in a step by step way to be sure we have the right answer:`.replace(/\n/g, ' ');

const OPENAI_URL = 'https://api.openai.com/v1/engines/gpt-3.5-turbo/completions';
const OPENAI_KEY = process.env.OPENAI_KEY;

app.post('/api/openai', async (req, res) => {
    const userInput = req.body.user_input;

    const prefixedMessageA = PROMPT_A.replace('{userInput}', userInput);
    let answerOptions = [];
    
    for (let i = 0; i < 3; i++) {
        try {
            const answerOption = await generateGptResponse(prefixedMessageA);
            answerOptions.push(`Answer Option ${i + 1}: ${answerOption}`);
        } catch (error) {
            return res.status(500).json({ error: error.toString() });
        }
    }

    const researcherPrompt = `"(${userInput})"\n` + answerOptions.join('\n') + 
    `\n\n${PROMPT_B}`;
    
    let researcherResponse;
    try {
        researcherResponse = await generateGptResponse(researcherPrompt);
    } catch (error) {
        return res.status(500).json({ error: error.toString() });
    }

    const resolverPrompt = `${PROMPT_C}`;
    
    let resolverResponse;
    try {
        resolverResponse = await generateGptResponse(resolverPrompt);
    } catch (error) {
        return res.status(500).json({ error: error.toString() });
    }

    res.json({ output: resolverResponse });
});

app.listen(3000, () => console.log('Listening on port 3000'));

async function generateGptResponse(prompt) {
    const response = await fetch(OPENAI_URL, {
        method: 'POST',
        headers: {
            'Authorization': 'Bearer ' + OPENAI_KEY,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            prompt: prompt,
            max_tokens: 2000,
            temperature: 0.5,
        }),
    });

    const data = await response.json();

    if (!data.choices || !data.choices.length) {
        throw new Error('No output from OpenAI');
    }

    return data.choices[0].text.trim();
}
