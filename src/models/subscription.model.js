import mongoose from "mongoose";

const subscriptionScehma = new mongoose.Schema({
    subscribers: {
        type: mongoose.Schema.Types.ObjectId,//One who is subscribing
        ref: "User",
        required: true
    },
    channel: {
        type: mongoose.Schema.Types.ObjectId,// The channel to which the user is subscribing
        ref: "User",
        required: true
    }
}, {timestamps: true });// timestamps will automatically add createdAt and updatedAt fields to the schema

const Subscription = mongoose.model("Subscription", subscriptionScehma);

export { Subscription };