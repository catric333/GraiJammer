import { Message } from "discord.js";
import {
    createAudioResource,
    createAudioPlayer,
    DiscordGatewayAdapterCreator,
    joinVoiceChannel,
    VoiceConnection,
    AudioPlayer,
    AudioResource,
    AudioPlayerStatus,
    VoiceConnectionStatus} from "@discordjs/voice";
import { ParseResponses } from "./parse-responses";
import { inject, injectable } from "inversify";
import { TYPES } from "../types";
import { createWriteStream, readdirSync } from "fs";
import { join } from "path";
import ytdl from "ytdl-core";
import ytpl from "ytpl";

@injectable()
export class MessageResponder {
    private responseParser: ParseResponses;
    private fileIndexLoop: number;
    private store: any[];
    private files: string[];
    private audioPlayer: AudioPlayer;
    private audioResource: AudioResource;
    private state: string;
    private voiceAdapterCreator: DiscordGatewayAdapterCreator;
    private voiceChannelId: string;
    private voiceChannelGuildId: string;
    private voiceConnection: VoiceConnection;
    private volume: number;

    constructor(
        @inject(TYPES.ParseResponses) responseParser: ParseResponses
    ) {
        this.responseParser = responseParser;
        this.store = [];
        this.files = [];
        this.state = "stop";
        this.volume = 0.1;
        readdirSync(join(__dirname, "..", "..", "assets")).forEach(file => {
            this.files.push(file);
        })
    }
    
    async awaitAudioResource(): Promise<boolean> {
        while (this.audioResource.readable != true) {
            await 100;
        }
        return ;
    }

    async handle(
        message: Message
    ): Promise<Message | Message[]> {
        const rawMessageContent = message.content.split(" ");
        const command = rawMessageContent[0].toLowerCase();
        if (this.responseParser.validateMessage(command)) {
            this.voiceChannelId = message.member.voice.channel.id
            this.voiceChannelGuildId = message.member.voice.channel.guildId
            this.voiceAdapterCreator = message.member.voice.channel.guild.voiceAdapterCreator
            if (!message.member.voice.channel) {
                return message.channel.send("You aren't in a voice channel")
            } else if (command.startsWith("!play")){
                const url: string = rawMessageContent[1];
                try {
                    if (ytdl.validateURL(url)) {
                        //let playlistID = await ytpl.getPlaylistID(url);
                        if (ytpl.validateID(url)) {
                            //to be implemented
                        } else {
                            let videoID = ytdl.getVideoID(url)
                            console.log("videoID", videoID);
                            if (ytdl.validateID(videoID)) {
                                let stream = ytdl(url, {
                                    filter: "audioonly",
                                    quality: "highestaudio",
                                    highWaterMark: 1<<25
                                });
                                console.log(stream);
                                this.store.push(stream);
                            }
                        }
                        
                    } else {
                        return message.reply("Invalid URL")
                    }
                    console.log(this.voiceConnection)
                    if (!this.voiceConnection) {
                        let fileIndex = Math.floor(Math.random() * this.files.length);
                        this.audioPlayer = createAudioPlayer();
                        console.log(join(__dirname,"..","..","assets",this.files[fileIndex]))
                        this.audioResource = createAudioResource(join(__dirname,"..","..","assets",this.files[fileIndex]), { inlineVolume: true });
                        console.log(this.audioResource)
                        this.audioResource.volume.setVolume(1.5);
                        this.voiceConnection = joinVoiceChannel({
                            "channelId": this.voiceChannelId,
                            "guildId": this.voiceChannelGuildId,
                            "adapterCreator": this.voiceAdapterCreator
                        });
                        
                        this.voiceConnection.subscribe(this.audioPlayer);
                        this.audioPlayer.play(this.audioResource);
                        this.state = "start";
                    }
                    
                    this.audioPlayer.on(AudioPlayerStatus.Idle, async () => {
                        console.log("audio player idle")
                        if (this.state == "start"
                            && this.voiceConnection.state.status == VoiceConnectionStatus.Ready
                        ) {
                            if (this.store.length != 0 && this.audioResource.ended) {
                                this.audioPlayer.stop();
                                let stream = this.store.pop();
                                this.audioResource = createAudioResource(stream, { inlineVolume: true });
                                await this.awaitAudioResource();
                                this.audioResource.volume.setVolume(this.volume);
                                this.audioPlayer.play(this.audioResource)
                            }
                        }
                    });
                    
                } catch {
                    console.log("shieeee")
                }
                return message.channel.send("Now playing <Insert Songname Here>")
            } else if (command == "!quoteall"){
                if (!this.voiceConnection) {
                    this.fileIndexLoop = 0;
                    this.audioPlayer = createAudioPlayer();
                    this.audioResource = createAudioResource(join(__dirname,"..","..","assets",this.files[this.fileIndexLoop]), {inlineVolume: true});
                    this.audioResource.volume.setVolume(this.volume);
                    this.voiceConnection = joinVoiceChannel({
                        "channelId": this.voiceChannelId,
                        "guildId": this.voiceChannelGuildId,
                        "adapterCreator": this.voiceAdapterCreator
                    });
                    this.voiceConnection.subscribe(this.audioPlayer);
                    this.audioPlayer.play(this.audioResource);
                    this.state = "start";
                }
                this.audioPlayer.on(AudioPlayerStatus.Idle, async () => {
                    console.log("audio player idle")
                    if (this.state == "start"
                        && this.voiceConnection.state.status == VoiceConnectionStatus.Ready
                    ) {
                        if (this.audioResource.ended) {
                            this.audioPlayer.stop();
                            this.fileIndexLoop++;
                            if (this.fileIndexLoop == this.files.length) {
                                this.fileIndexLoop = 0;
                            }
                            this.audioResource = createAudioResource(join(__dirname,"..","..","assets",this.files[this.fileIndexLoop]), {inlineVolume: true});
                            await this.awaitAudioResource();
                            this.audioPlayer.play(this.audioResource)
                        }
                    }
                });
                return message;
            } else if (command == "!quoteloop"){
                if (!this.voiceConnection) {
                    let fileIndex = Math.floor(Math.random() * this.files.length);
                    this.audioPlayer = createAudioPlayer();
                    this.audioResource = createAudioResource(join(__dirname,"..","..","assets",this.files[fileIndex]), {inlineVolume: true});
                    this.audioResource.volume.setVolume(this.volume);
                    this.voiceConnection = joinVoiceChannel({
                        "channelId": this.voiceChannelId,
                        "guildId": this.voiceChannelGuildId,
                        "adapterCreator": this.voiceAdapterCreator
                    });
                    this.voiceConnection.subscribe(this.audioPlayer);
                    this.audioPlayer.play(this.audioResource);
                    this.state = "start";
                }
                this.audioPlayer.on(AudioPlayerStatus.Idle, async () => {
                    console.log("audio player idle")
                    if (this.state == "start"
                        && this.voiceConnection.state.status == VoiceConnectionStatus.Ready
                    ) {
                        if (this.audioResource.ended) {
                            this.audioPlayer.stop();
                            let fileIndex = Math.floor(Math.random() * this.files.length);
                            this.audioResource = createAudioResource(join(__dirname,"..","..","assets",this.files[fileIndex]), {inlineVolume: true});
                            await this.awaitAudioResource();
                            this.audioPlayer.play(this.audioResource)
                        }
                    }
                });
                return message;
            } else if (command == ("!quote")){
                if (!this.voiceConnection) {
                    this.state = "start";
                    this.audioPlayer = createAudioPlayer();
                    this.voiceConnection = joinVoiceChannel({
                        "channelId": this.voiceChannelId,
                        "guildId": this.voiceChannelGuildId,
                        "adapterCreator": this.voiceAdapterCreator
                    });
                    let fileIndex = Math.floor(Math.random() * this.files.length);
                    this.audioResource = createAudioResource(join(__dirname,"..","..","assets",this.files[fileIndex]), {inlineVolume: true});
                    this.audioResource.volume.setVolume(this.volume);
                    this.voiceConnection.subscribe(this.audioPlayer);
                    this.audioPlayer.play(this.audioResource); 
                }
                this.audioPlayer.on(AudioPlayerStatus.Idle, async () => {
                    console.log("audio player idle")
                    if (this.state == "start"
                        && this.voiceConnection.state.status == VoiceConnectionStatus.Ready
                    ) {
                        if (this.audioResource.ended) {
                            this.voiceConnection.destroy();
                            this.voiceConnection = void 0
                            this.audioPlayer.stop();
                            this.state = "stop";
                        }
                    }
                });
                return message;
            } else if (command == "!troll") {
                if (!this.voiceConnection) {
                    this.voiceConnection = joinVoiceChannel({
                        "channelId": this.voiceChannelId,
                        "guildId": this.voiceChannelGuildId,
                        "adapterCreator": this.voiceAdapterCreator
                    });
                    this.state = "start";
                    await 10;
                    this.voiceConnection.destroy();
                    this.voiceConnection = void 0;
                    this.state = "stop";
                    return message;
                } else {
                    return message.reply("I'm already trolling you by being in voice with you cuh")
                }
            } else if (command.startsWith("!leave")){
                if (this.voiceConnection) {
                    this.voiceConnection.destroy();
                    this.voiceConnection = void 0;
                    this.audioPlayer.stop();
                    this.state = "stop";
                    return message.channel.send("Shieeee goodbye");
                } else {
                    return message.reply("I am not in voice currently");
                }
            } else if (command.startsWith("!volume") || command.startsWith("!boost")){
                let volume = rawMessageContent[1];
                if (!isNaN(+volume) && +volume < 100.0 && +volume > 0.0) {
                    this.audioResource.volume.setVolume(+volume);
                    return message.channel.send("Set volume to " + volume);
                } else {
                    return message.reply("Your value should be a number from 0.0 to 100.0");
                }

            }
            //Placeholder, remove when all options are implemented
            return message.channel.send("ayo wassup cuh?");
        }
        return Promise.reject();
    }
}
