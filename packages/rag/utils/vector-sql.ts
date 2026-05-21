/*
 pgvector accepts vector values in text form like '[1,2,3]', 
 and pgvector requires vector elements to be finite.
*/

export function toPgVector(values : number[]){
    if(values.length !== 768){
        throw new Error(`Expected 768 values, received ${values.length}`);
    };

    for(const value of values){
        if(!Number.isFinite(value)){
            throw new Error(`Embedding contains non-finite values`);
        }
    }

    return `[${values.join(",")}]`;
}