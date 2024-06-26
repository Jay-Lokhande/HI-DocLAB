import { db } from "@/db";
import { openai } from "@/lib/openai";
import { SendMessageValidator } from "@/lib/validators/SendMessageValidaor";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { MissingSlotContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { NextRequest } from "next/server";
import {OpenAIStream, StreamingTextResponse} from "ai"
import { SupabaseVectorStore } from "@langchain/community/vectorstores/supabase";
import { createClient } from "@supabase/supabase-js";

export const POST = async (req: NextRequest) => {

  // endpoint dor asking a question to a pdf file
  const body = await req.json();

  const { getUser } = getKindeServerSession();
  const user = await getUser();

  // const { id: userId } = user;
  const userId = user?.id;
  if (!userId)
  return new Response('Unauthorized', { status: 401 })

  const { fileId, message } =
  SendMessageValidator.parse(body)

  const file = await db.file.findFirst({
  where: {
    id: fileId,
    userId,
  },
  })


  if (!file) return new Response("Not found", { status: 404 });

  await db.message.create({
    data: {
      text: message,
      isUserMessage: true,
      userId,
      fileId
    },
  })

  // vectorize message
   const embeddings = new OpenAIEmbeddings({
    openAIApiKey: process.env.OPENAI_API_KEY,
   })


   const privateKey = process.env.SUPABASE_PRIVATE_KEY;
    if (!privateKey) throw new Error(`Expected env var SUPABASE_PRIVATE_KEY`);

    const url = process.env.SUPABASE_URL;
    if (!url) throw new Error(`Expected env var SUPABASE_URL`);
    const client = createClient(
        process.env.SUPABASE_URL || "",
        process.env.SUPABASE_PRIVATE_KEY || ""
    );
    const vectorStore = await SupabaseVectorStore.fromExistingIndex(
        new OpenAIEmbeddings(), 
        {
            client,
            tableName: "documents",
            queryName: "match_documents",
        }
        );
        const results = await vectorStore.similaritySearch(message, 4);
//  const pinecone = await getPineconeClient()
  //  const pineconeIndex = pinecone.Index("hi-doclab");

  //  const vectorStrore = await PineconeStore.fromExistingIndex(embeddings, {
    // pineconeIndex,
    // namespace: file.id
  //  })

  //  const results = await vectorStrore.similaritySearch(message, 4);

   const prevMessages = await db.message.findMany({
    where: {
      fileId,
    },
    orderBy: {
      createdAt: "asc",
    },
    take: 6,
   })

   const formattedPrevMessages = prevMessages.map((msg) => ({
    role: msg.isUserMessage ? "user" as const : "assistant" as const,
    content: msg.text
   }))

   const response = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    temperature: 0,
    stream: true,
    messages: [
      {
        role: 'system',
        content:
          'Use the following pieces of context (or previous conversaton if needed) to answer the users question in markdown format.',
      },
      {
        role: 'user',
        content: `Use the following pieces of context (or previous conversaton if needed) to answer the users question in markdown format. \nIf you don't know the answer, just say that you don't know, don't try to make up an answer.
        
        \n----------------\n
  
        PREVIOUS CONVERSATION:
        ${formattedPrevMessages.map((message) => {
          if (message.role === 'user')
            return `User: ${message.content}\n`
          return `Assistant: ${message.content}\n`
        })}
        
        \n----------------\n
        
        CONTEXT:
        ${results.map((r) => r.pageContent).join('\n\n')}
        
        USER INPUT: ${message}`,
            },
          ],
        })
      
        const stream = OpenAIStream(response, {
          async onCompletion(completion) {
            await db.message.create({
              data: {
                text: completion,
                isUserMessage: false,
                fileId,
                userId,
              },
            })
          },
        })
      
        return new StreamingTextResponse(stream)
      }