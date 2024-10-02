import { Telegraf } from "telegraf";
import {message} from 'telegraf/filters';
import eventModel from './src/models/Event.js'
import userModel from './src/models/user.js';
import connectDB from './src/config/db.js'
import { GoogleGenerativeAI } from "@google/generative-ai";
import axios from 'axios';


// CREATE BOT INSTANCE
//CREATE genAI INSTNACE AND ALSO GET THE MODEL
const bot=new Telegraf(process.env.BOT_TOKEN)
const genAI = new GoogleGenerativeAI(process.env.API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash"});



//MONGODB CONNECTION
try{
    //HERE WE CONNECT DATABASE
    connectDB()
    console.log("DATABSE CONNECTD SUCCESSFULLY")
}
catch(err){
    console.log(err)
    // to shut down thebot
    process.kill(process.pid,'SIGTERM')
}

//DIFFERENT COMMAND OF BOT
//ctx-->contains users information who has started the telegram 
//ctx.reply() WILL REPLY THE TEXT THAT WE WILL GET FROM OPENAI
bot.start(async(ctx)=>{
    console.log("CONTEXT OF USER->",ctx)

    //STORE THE USER INFOMRATION FROM ctx who has started
    const from=ctx.update.message.from
    console.log("user info->",from)

    // IT IS FOR CREATING THE DATABASE
    /*
    WE ARE NOT USING userModel.create() HERE BECAUSE IT WILL CREATE N IDENTITIES FOR N CONTENT THIS WILL CREAT A LOT IENTITES
    TO AVOID THESE WE USE findOneAndUpdate() BASICALLY IT WILL CHECK USER IS THERE OR NOT IF THERE THEN UPDATE THE CONTENT IF NOT THEN CREATE NEW IDENTITY OF USER usinf $setOnInsert
    */ 
    try
    {
        await userModel.findOneAndUpdate({tgId:from.id},{
        $setOnInsert:{
            firstName:from.first_name,
            lastName:from.last_name,
            isBot:from.is_bot
        }},
        {upsert:true,new:true});
        await ctx.reply(`welcome${from.first_name}FOR GIVING THE INFORMATION`);
    }catch(err)
    {
        console.log(err)
        await ctx.reply("FACING DIFFICULTY")
    }
    //await ctx.reply("welcome bot is working...")
    // console.log("welcome bot is working...")
}) 



//GENERATE
//GENERATE IS THE EVENT(ACTION PERFORMED BY USER)
//WHEN U WRITE GENERATE THEN bot.command() WILL RUN AND WILL SEARCH FOR ALL THE EVENTS GIVEN AT THAT DAYA NAD GENERATE TEXT FOR IT
bot.command('generate',async(ctx)=>{
    //GET EVENTS FROM THE USER
    const from=ctx.update.message.from
    console.log("-->",from)

    //THIS MESSAGE SHOWN UNTIL HUGGING FACE DOENOT GENERATES TEXT FOR U
    const {message_id:waitingMessageId}=await ctx.reply(
        `Hey ${from.first_name},kindly wait for a moment,I am curating posts for you🚀`
    )

    //THIS STICKER SHOWN UNTIL HUGGING FACE DOENOT GENERATES TEXT FOR U
    const{message_id:loadingStickerId}=await ctx.replyWithSticker(
        'CAACAgIAAxkBAAO3ZqQBenQIunvIhW9QXKMGTMunDRgAArwMAAKHKDBJ7TeRmVghaAQ1BA')

    //START OF DAY
    const startOfDay=new Date()
    startOfDay.setHours(0,0,0,0)

    //END OF DAY
    const endOfDay=new Date()
    endOfDay.setHours(23,59,59,999)
                       
    //TO FIND THE EVENT 
    const events=await eventModel.find({
        tgId:from.id,
        //GET ONLY THAT EVENTS THAT WAS CREATED AT THAT DAY
        createdAt:{
            $gte:startOfDay,
            $lte:endOfDay,
        }
    });
    
    if(events.length===0){
        //DELTING THE WAIING MSG
        await ctx.deleteMessage(waitingMessageId)
        await ctx.deleteMessage(loadingStickerId)
        await ctx.reply("NO EVENTS FOR THE DAY.....")
        return
    }
    console.log("EVENTS->",events) 


    const eventTexts = events.map(event => event.text).join(' ');

    const prompt = `HI ${from.first_name} AND THIS ARE MY EVENTS ${eventTexts}`;
    try {
        
        const result = await model.generateContent(prompt);
        const response = result.response;
        const text = response.text();
        function formatText(text) {
            // Trim leading and trailing whitespace
            text = text.trim();
            
            // Capitalize the first letter of each sentence
            text = text.replace(/(?:^|\.\s*)([a-z])/g, function(match, p1) {
                return match.toUpperCase();
            });
            
            // Ensure sentences end with proper punctuation
            text = text.replace(/([a-zA-Z0-9])([.!?])(\s|$)/g, function(match, p1, p2, p3) {
                return p1 + p2 + (p3 ? ' ' : '');
            });
            
            // Add line breaks between paragraphs (if applicable)
            text = text.replace(/\n\s*\n/g, '\n\n');
            
            return text;
        }
        var t1=formatText(text) 
        await ctx.deleteMessage(waitingMessageId)
        await ctx.deleteMessage(loadingStickerId)
        console.log("GENERATED TEXT:-",t1)
        await ctx.reply(t1);
        }catch (err) {
        console.log("facing difficulties", err.message);
        await ctx.reply("Error generating text");
    }   
})


// bot.command('generate', async (ctx) => {cls

//     // Get user info
//     const from = ctx.update.message.from;
//     console.log("-->", from);

//     // Show a waiting message to the user
//     const { message_id: waitingMessageId } = await ctx.reply(
//         `Hey ${from.first_name}, kindly wait for a moment, I am curating posts for you🚀`
//     );

//     // Show a loading sticker to the user
//     const { message_id: loadingStickerId } = await ctx.replyWithSticker(
//         'CAACAgIAAxkBAAO3ZqQBenQIunvIhW9QXKMGTMunDRgAArwMAAKHKDBJ7TeRmVghaAQ1BA'
//     );

//     // Get the start and end of the day
//     const startOfDay = new Date();
//     startOfDay.setHours(0, 0, 0, 0);

//     const endOfDay = new Date();
//     endOfDay.setHours(23, 59, 59, 999);

//     // Find events created by the user on the same day
//     const events = await eventModel.find({
//         tgId: from.id,
//         createdAt: {
//             $gte: startOfDay,
//             $lte: endOfDay,
//         }
//     });

//     if (events.length === 0) {
//         // Delete the waiting message and sticker
//         await ctx.deleteMessage(waitingMessageId);
//         await ctx.deleteMessage(loadingStickerId);
//         await ctx.reply("NO EVENTS FOR THE DAY.....");
//         return;
//     }

//     console.log("EVENTS->", events);

//     // Combine event texts into a single input string
//     const eventTexts = events.map(event => event.text).join('. ');

//     // Create a prompt for the Hugging Face API with context
//     const prompt = `Based on the following events: ${eventTexts}, generate LinkedIn, Facebook, and Instagram posts that highlight the key points and context of these events. The posts should be engaging and relevant to each platform.`;

//     try {
//         // Call the Hugging Face API to generate the posts
//         const response = await axios.post(
//             hfApiUrl,
//             { inputs: prompt },
//             {
//                 headers: {
//                     'Authorization': `Bearer ${hfApiToken}`,
//                 },
//             }
//         );

//         // Delete the waiting message and sticker
//         await ctx.deleteMessage(waitingMessageId);
//         await ctx.deleteMessage(loadingStickerId);

//         console.log("Generated Text:", response.data);

//         // Extract the generated posts
//         const generatedPosts = response.data[0].generated_text;

//         // Send the generated posts to the user
//         await ctx.reply(generatedPosts);

//     } catch (err) {
//         console.log("Error generating text:", err.message);
//         await ctx.reply("Error generating text");
//     }
// });

// bot.command('generate', async (ctx) => {
//     // Get user info
//     const from = ctx.update.message.from;
//     console.log("-->", from);

//     // Show a waiting message to the user
//     const { message_id: waitingMessageId } = await ctx.reply(
//         `Hey ${from.first_name}, kindly wait for a moment, I am curating posts for you🚀`
//     );

//     // Show a loading sticker to the user
//     const { message_id: loadingStickerId } = await ctx.replyWithSticker(
//         'CAACAgIAAxkBAAO3ZqQBenQIunvIhW9QXKMGTMunDRgAArwMAAKHKDBJ7TeRmVghaAQ1BA'
//     );

//     // Get the start and end of the day
//     const startOfDay = new Date();
//     startOfDay.setHours(0, 0, 0, 0);

//     const endOfDay = new Date();
//     endOfDay.setHours(23, 59, 59, 999);

//     // Find events created by the user on the same day
//     const events = await eventModel.find({
//         tgId: from.id,
//         createdAt: {
//             $gte: startOfDay,
//             $lte: endOfDay,
//         }
//     });

//     if (events.length === 0) {
//         // Delete the waiting message and sticker
//         await ctx.deleteMessage(waitingMessageId);
//         await ctx.deleteMessage(loadingStickerId);
//         await ctx.reply("NO EVENTS FOR THE DAY.....");
//         return;
//     }

//     console.log("EVENTS->", events);

//     // Combine event texts into a single input string
//     const eventTexts = events.map(event => event.text).join('. ');

//     // Create a prompt for the GPT-2 model with context
//     const prompt = `Based on the following events: ${eventTexts}, generate LinkedIn, Facebook, and Instagram posts that highlight the key points and context of these events. The posts should be engaging and relevant to each platform.`;

//     try {
//         // Load the tokenizer and model
//         const tokenizer = GPT2Tokenizer.from_pretrained('gpt2');
//         const model = GPT2LMHeadModel.from_pretrained('gpt2');

//         // Tokenize the input prompt
//         const input_ids = tokenizer.encode(prompt, return_tensors='pt');

//         // Generate text using the model
//         const output = await model.generate(input_ids, max_length=300, num_return_sequences=1);

//         // Decode the generated text
//         const generated_text = tokenizer.decode(output[0], skip_special_tokens=True);

//         // Delete the waiting message and sticker
//         await ctx.deleteMessage(waitingMessageId);
//         await ctx.deleteMessage(loadingStickerId);

//         console.log("Generated Text:", generated_text);

//         // Send the generated posts to the user
//         await ctx.reply(generated_text);

//     } catch (err) {
//         console.log("Error generating text:", err.message);
//         await ctx.reply("Error generating text");
//     }
// });









//TO STORE THE text SUCH AS "HUURAH" THAT HAS BEEN GIVEN BY USER on telegram MEANS 
//TEXT OR MESSAGE CAN BE TEXT,AUDIO,GIVEAWAY...
//IF WE type /start THEN BOT.START WORKS
bot.on(message('text'),async(ctx)=>{
    console.log("CTX-->",ctx)
    // TO GET THE TEXT THAT USER HAD ENTERED
    const message=ctx.update.message.text
    //TO GET WHOLE DETAILS OF USER
    const from=ctx.update.message.from
    try{
        await eventModel.create({
            text:message,
            tgId:from.id
        })
        ctx.reply(`THANKU FOR MESSAGING ${from.first_name}...`)
    }
    catch(err){
        console.log(err)
        await ctx.reply("FACING DIFFICULTY")
    }

})


//to get sticker details
// bot.on(message('sticker'),(ctx)=>{
//     console.log("STICKER DETAILS-->",ctx.update.message)

// })
//LAUNCHING THE BOT
bot.launch()

// Enable graceful stop 
//TO STOP THE BOT
process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))
