
const { createOpenAI } = require('@ai-sdk/openai');

async function testNvidia() {
  const apiKey = "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";

  const nvidia = createOpenAI({
    apiKey,
    baseURL: "https://integrate.api.nvidia.com/v1",
  });

  try {
    const model = nvidia("meta/llama-3.3-70b-instruct");
    console.log("Initializing request to meta/llama-3.3-70b-instruct...");
    
    // Since we are using the AI SDK, the model object is a function.
    // To test a simple completion, we use generateText from 'ai' package
    // But since this is a simple node script, let's try to use the underlying OpenAI client if possible
    // or just try a simple fetch to verify the endpoint and API key.
    
    const response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "meta/llama-3.3-70b-instruct",
        messages: [{ role: "user", content: "Hello, are you working?" }],
        max_tokens: 10,
      }),
    });

    const data = await response.json();
    console.log("Response status:", response.status);
    console.log("Response data:", JSON.stringify(data, null, 2));
    
    if (response.ok) {
      console.log("Connection successful!");
    } else {
      console.error("API returned an error.");
    }
  } catch (error) {
    console.error("Connection failed:");
    console.error(error);
  }
}

testNvidia();
