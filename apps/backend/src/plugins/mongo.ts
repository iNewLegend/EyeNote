import fastifyPlugin from "fastify-plugin";

import mongoose from "mongoose";

import { appConfig } from "@eye-note/backend/src/config";

import type { FastifyInstance } from "fastify";

declare module "fastify" {
    interface FastifyInstance {
        mongoose : typeof mongoose;
    }
}

async function mongooseConnector ( fastify : FastifyInstance ) {
    await mongoose.connect( appConfig.mongo.uri, {
        dbName: appConfig.mongo.dbName,
    } );

    fastify.decorate( "mongoose", mongoose );

    fastify.addHook( "onClose", async () => {
        await mongoose.connection.close();
    } );
}

export const mongoPlugin = fastifyPlugin( mongooseConnector );
