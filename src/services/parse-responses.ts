import { injectable } from "inversify";
import { commands } from "../constants/commands"

@injectable()
export class ParseResponses {
    public validateMessage(target: string): boolean {
        return commands.includes(target);
    }
}
