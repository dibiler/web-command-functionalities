import { HelpCommand } from './definitions/HelpCommand';
import { ListChangeSeparatorCommand } from './definitions/listCommands/ListChangeSeparatorCommand';
import { ListFilterCommand } from './definitions/listCommands/ListFilterCommand';
import { ListRandomCommand } from './definitions/listCommands/ListRandomCommand';
import { ListSortCommand } from './definitions/listCommands/ListSortCommand';
import { ListUniqueCommand } from './definitions/listCommands/ListUniqueCommand';

import type { AbstractCommand } from './AbstractCommand';
import type { CommandDefinition } from '../types/commands';

const registry: AbstractCommand[] = [
    new HelpCommand(),
    new ListRandomCommand(),
    new ListUniqueCommand(),
    new ListFilterCommand(),
    new ListSortCommand(),
    new ListChangeSeparatorCommand(),
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
