import { HelpCommand } from './definitions/HelpCommand';
import { DateFormatCommand } from './definitions/dateCommands/DateFormatCommand';
import { ListChangeSeparatorCommand } from './definitions/listCommands/ListChangeSeparatorCommand';
import { ListFilterCommand } from './definitions/listCommands/ListFilterCommand';
import { ListFromRangeCommand } from './definitions/listCommands/ListFromRangeCommand';
import { ListRandomCommand } from './definitions/listCommands/ListRandomCommand';
import { ListSortCommand } from './definitions/listCommands/ListSortCommand';
import { ListUniqueCommand } from './definitions/listCommands/ListUniqueCommand';
import { StringHashCommand } from './definitions/stringCommands/StringHashCommand';
import { StringPasswordCommand } from './definitions/stringCommands/StringPasswordCommand';

import type { AbstractCommand } from './AbstractCommand';
import type { CommandDefinition } from '../types/commands';

const registry: AbstractCommand[] = [
    new HelpCommand(),
    new DateFormatCommand(),
    new ListRandomCommand(),
    new ListUniqueCommand(),
    new ListFilterCommand(),
    new ListFromRangeCommand(),
    new ListSortCommand(),
    new ListChangeSeparatorCommand(),
    new StringHashCommand(),
    new StringPasswordCommand(),
];

export function getCommandRegistry(): AbstractCommand[] {
    return registry;
}

export function getCommandDefinitions(): CommandDefinition[] {
    return registry.map((command) => command.metadata());
}

export function findCommandByName(name: string): AbstractCommand | undefined {
    return registry.find((command) => command.name === name);
}
