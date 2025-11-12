import fastifyPlugin from "fastify-plugin";
import mongoose from "mongoose";
import { liveConfig } from "../config";

export const mongoPlugin = fastifyPlugin( async ( fastify ) => {
    if ( mongoose.connection.readyState === 1 ) {
        fastify.log.info( "Mongo already connected" );
        return;
    }

    mongoose.set( "strictQuery", false );

    await mongoose.connect( liveConfig.mongo.uri, {
        dbName: liveConfig.mongo.dbName,
    } );

    fastify.addHook( "onClose", async () => {
        await mongoose.connection.close();
    } );
} );
