import { Schema, model, models, type Document, type Model } from "mongoose";

export interface PageIdentityDocument extends Document {
    normalizedUrl : string;
    canonicalUrl ?: string | null;
    contentSignature : string;
    layoutSignature : string;
    layoutTokens : string[];
    textTokenSample : number;
    sourceUrls : string[];
    lastSeenAt : Date;
    createdAt : Date;
    updatedAt : Date;
}

const pageIdentitySchema = new Schema<PageIdentityDocument>(
    {
        normalizedUrl: { type: String, required: true, index: true },
        canonicalUrl: { type: String, default: null, index: true },
        contentSignature: { type: String, required: true },
        layoutSignature: { type: String, required: true },
        layoutTokens: { type: [ String ], default: [] },
        textTokenSample: { type: Number, default: 0 },
        sourceUrls: { type: [ String ], default: [] },
        lastSeenAt: { type: Date, default: () => new Date(), index: true },
    },
    {
        timestamps: true,
    }
);

pageIdentitySchema.index( { normalizedUrl: 1, canonicalUrl: 1 } );

export const PageIdentityModel : Model<PageIdentityDocument> =
    models.PageIdentity || model<PageIdentityDocument>( "PageIdentity", pageIdentitySchema );
