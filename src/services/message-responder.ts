import { Message } from "discord.js";
import {
    createAudioResource,
    createAudioPlayer,
    DiscordGatewayAdapterCreator,
    joinVoiceChannel,
    VoiceConnection,
    AudioPlayer,
    AudioResource } from "@discordjs/voice";
import { ParseResponses } from "./parse-responses";
import { inject, injectable } from "inversify";
import { TYPES } from "../types";
import { readdirSync } from "fs";
import { join } from "path";

@injectable()
export class MessageResponder {
    private responseParser: ParseResponses;
    private store: [];
    private files: string[];
    private audioPlayer: AudioPlayer;
    private audioResource: AudioResource;
    private voiceAdapterCreator: DiscordGatewayAdapterCreator;
    private voiceChannelId: string;
    private voiceChannelGuildId: string;
    private voiceConnection: VoiceConnection;

    constructor(
        @inject(TYPES.ParseResponses) responseParser: ParseResponses
    ) {
        this.responseParser = responseParser;
        this.store = [];
        this.files = [];
        readdirSync(join(__dirname, "..", "..", "assets")).forEach(file => {
            this.files.push(file);
        })
    }

    handle(
        message: Message
    ): Promise<Message | Message[]> {
        if (this.responseParser.validateMessage(message.content)) {
            this.voiceChannelId = message.member.voice.channel.id
            this.voiceChannelGuildId = message.member.voice.channel.guildId
            this.voiceAdapterCreator = message.member.voice.channel.guild.voiceAdapterCreator
            if (message.content.toLowerCase().startsWith("!play")){
                try {
                    if (!this.voiceConnection) {
                        let fileIndex = Math.floor(Math.random() * this.files.length);
                        this.audioPlayer = createAudioPlayer();
                        this.audioResource = createAudioResource(join(__dirname,"..","..","assets",this.files[fileIndex]), {inlineVolume: true});
                        this.audioResource.volume.setVolume(1.0);
                        this.voiceConnection = joinVoiceChannel({
                            "channelId": this.voiceChannelId,
                            "guildId": this.voiceChannelGuildId,
                            "adapterCreator": this.voiceAdapterCreator
                        });
                        this.voiceConnection.subscribe(this.audioPlayer);
                        this.audioPlayer.play(this.audioResource);
                    }
                    
                } catch {
                    console.log("shieeee")
                }
                return message.channel.send("Now playing <Insert Songname Here>")         
            } else if (message.content.toLowerCase().startsWith("!leave")){
                if (!message.member.voice.channel) {
                    return message.channel.send("You aren't in a voice channel")
                } else if (this.voiceConnection) {
                    this.voiceConnection.destroy()
                    this.voiceConnection = void 0;
                    this.audioPlayer.stop()
                    return message.channel.send("Shieeee goodbye")
                } else {
                    return message.channel.send("I am not in voice currently")
                }
            }

            return message.channel.send("ayo wassup cuh?");
        }
        return Promise.reject();
    }
}
