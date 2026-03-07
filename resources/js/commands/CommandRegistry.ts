import { HelpCommand } from './definitions/HelpCommand';
import { ListFilterCommand } from './definitions/ListFilterCommand';
import { ListRandomCommand } from './definitions/ListRandomCommand';
import { ListSortAscCommand } from './definitions/ListSortAscCommand';
import { ListUniqueCommand } from './definitions/ListUniqueCommand';

import type { AbstractCommand } from './AbstractCommand';
import type { CommandDefinition } from '../types/commands';

const registry: AbstractCommand[] = [
    new HelpCommand(),
    new ListRandomCommand(),
    new ListUniqueCommand(),
    new ListFilterCommand(),
    new ListSortAscCommand(),
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
