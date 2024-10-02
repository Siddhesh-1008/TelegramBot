async function generateParagraph(inputText) {
    const hfApiUrl = 'https://api-inference.huggingface.co/models/YOUR_MODEL_NAME';
    const hfApiToken = 'YOUR_HF_API_TOKEN';

    try {
        const response = await axios.post(
            hfApiUrl,
            { inputs: inputText },
            {
                headers: {
                    'Authorization': `Bearer ${hfApiToken}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        const generatedText = response.data[0].generated_text;
        console.log("GENERATED TEXT:-", generatedText);
        return generatedText;
    } catch (err) {
        console.error("Error generating text:", err.message);
        return "Error generating text.";
    }
}