import { mkdir, writeFile } from "node:fs/promises";
import path from "path";
/*
Take uploaded File
→ validate PDF
→ write it to apps/web/uploads
→ return storagePath
*/

/*
For duplicate detection, the upload route should read the file once, compute hash,
then only save if needed.
*/

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

export async function saveUploadedFile(file : File, buffer : Buffer){

    if(file.type !== "application/pdf"){
        throw new Error("Only PDF file are supported currently");
    }

    if(file.size > MAX_FILE_SIZE_BYTES){
        throw new Error("PDF must be smaller than 10 MB");
    }

    const uploadDir = path.join(process.cwd(),"uploads");
    await mkdir(uploadDir, { recursive : true });

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const filename = `${Date.now()}-${safeName}`;
    const storagePath = path.join(uploadDir, filename);

    await writeFile(storagePath, buffer);

    return {
        filename : file.name,
        mimeType : file.type,
        sizeBytes : file.size,
        storagePath,
    };
}