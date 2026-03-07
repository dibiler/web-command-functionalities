import type {
    CommandDefinition,
    CommandExecutionContext,
    CommandExecutionResult,
    CommandInputValues,
    CommandParameterDefinition,
} from '../types/commands';

export abstract class AbstractCommand {
    abstract readonly name: string;
    abstract readonly group: string;
    abstract readonly description: string;
    abstract readonly parameters: readonly CommandParameterDefinition[];

    abstract execute(input: CommandInputValues, context: CommandExecutionContext): CommandExecutionResult;

    metadata(): CommandDefinition {
        return {
            name: this.name,
            group: this.group,
            description: this.description,
            parameters: this.parameters,
        };
    }

    protected parseCommaSeparatedList(rawValue: unknown): string[] {
        if (typeof rawValue !== 'string') {
            return [];
        }

        return rawValue
            .split(',')
            .map((item) => item.trim())
            .filter((item) => item.length > 0);
    }
}
