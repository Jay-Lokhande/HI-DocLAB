import { db } from "@/db";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { createUploadthing, type FileRouter } from "uploadthing/next";
import { PDFLoader } from "langchain/document_loaders/fs/pdf";
import { OpenAIEmbeddings } from "@langchain/openai";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import {
  AstraDBVectorStore,
  AstraLibArgs,
} from "@langchain/community/vectorstores/astradb";

import { SupabaseVectorStore } from "@langchain/community/vectorstores/supabase";
import { createClient } from '@supabase/supabase-js'
//import { run } from "@/lib/quickstart";
const f = createUploadthing();

export const ourFileRouter = {
  pdfUploader: f({ pdf: { maxFileSize: "4MB" } })
    .middleware(async ({ req }) => {
      const { getUser } = getKindeServerSession();
      const user = await getUser();

      if (!user || !user.id) throw new Error("Unauthorized");

      return { userId: user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      const createdFile = await db.file.create({
        data: {
          key: file.key,
          name: file.name,
          userId: metadata.userId,
          url: `https://utfs.io/f/${file.key}`,
          uploadStatus: "PROCESSING",
        },
      })

      try {
        const response = await fetch(`https://utfs.io/f/${file.key}`);
        const blob = await response.blob();
        const loader = new PDFLoader(blob);
        console.log("loader")
        console.log(loader)
        console.log(blob)

        const pageLevelDocs = await loader.load();
        console.log("page level")
        console.log(pageLevelDocs)

        const pagesAmt = pageLevelDocs.length;

        const splitter = new RecursiveCharacterTextSplitter({
          chunkSize: 1000,
          chunkOverlap: 15,
        });
        const texts = await splitter.splitDocuments(pageLevelDocs);
        console.log("Loaded ", texts.length, " documents.");
        
      

/*Supabase*/
const privateKey = process.env.SUPABASE_PRIVATE_KEY;
if (!privateKey) throw new Error(`Expected env var SUPABASE_PRIVATE_KEY`);

const url = process.env.SUPABASE_URL;
if (!url) throw new Error(`Expected env var SUPABASE_URL`);

const run = async () => {
  const client = createClient(url, privateKey);

  const vectorStore = await SupabaseVectorStore.fromDocuments(
    texts,
    new OpenAIEmbeddings({
        openAIApiKey: process.env.OPENAI_API_KEY,
      }),
    {
      client,
      tableName: "documents",
      queryName: "match_documents",
    }
  );

  const resultOne = await vectorStore.similaritySearch("Hello world", 1);

  console.log("asdfasdf")
  console.log(resultOne);
};
run()
  .then(() => {
    console.log("Function executed successfully");
  })
  .catch((error) => {
    console.error("Error:", error);
  });







        // If the collection does not exist, it is created automatically.
        // const astraConfig: AstraLibArgs = {
        //   token: """
        //   endpoint: "",
        //   collection: "jaylovelab",
        //   collectionOptions: {
        //     vector: {
        //       dimension: 1536,
        //       metric: "cosine",
        //     },
        //   },
        // };
        // const astraConfig = await getAstraConfig();
        


        // const embeddings = new OpenAIEmbeddings({
        //   openAIApiKey: process.env.OPENAI_API_KEY,
        // });
        // const astraConfig = await astras. ")
        // console.log(texts)
        // const vectorStore = await AstraDBVectorStore.fromDocuments(
        //   texts,
        //   new OpenAIEmbeddings({ openAIApiKey: process.env.OPENAI_API_KEY }),
        //   astraConfig
        // );
        // vectorStore.addDocuments(texts);




        await db.file.update({
          data: {
            uploadStatus: "SUCCESS"
          },
          where: {
            id: createdFile.id
          }
        })
      } catch (err) {
        await db.file.update({
          data: {
            uploadStatus: "FAILED"
          },
          where: {
            id: createdFile.id
          },
        })
      }
    })
    ,
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
