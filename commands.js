import 'dotenv/config';
import { InstallGlobalCommands } from './utils.js';

const REPORTS_COMMAND = {
  name: 'reports',
  description: 'List open, unresolved reports',
  type: 1,
};

const PLAYER_HISTORY_COMMAND = {
  name: 'player-history',
  description: "Look up a player's report history",
  type: 1,
  options: [
    {
      type: 3, // STRING
      name: 'user_id',
      description: 'Roblox user ID of the player',
      required: true,
    },
  ],
};

function moderationCommand(name, description) {
  return {
    name,
    description,
    type: 1,
    options: [
      {
        type: 4, // INTEGER
        name: 'report_id',
        description: 'The report ID (shown in the webhook embed)',
        required: true,
      },
    ],
  };
}

const RESOLVE_COMMAND = moderationCommand('resolve', 'Mark a report as resolved');
const IGNORE_COMMAND = moderationCommand('ignore', 'Mark a report as ignored');
const BAN_COMMAND = moderationCommand('ban', 'Mark a report as resulting in a ban');

const ALL_COMMANDS = [
  REPORTS_COMMAND,
  PLAYER_HISTORY_COMMAND,
  RESOLVE_COMMAND,
  IGNORE_COMMAND,
  BAN_COMMAND,
];

InstallGlobalCommands(process.env.APP_ID, ALL_COMMANDS);