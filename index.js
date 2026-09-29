const {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  PermissionsBitField
} = require("discord.js");

const fs = require("fs");
const path = require("path");
const http = require("http");

// ============================================================
// 🤖 DED-BOT
// ============================================================

const TOKEN = process.env.DISCORD_TOKEN;
const PORT = process.env.PORT || 3000;

const DATA_FILE = path.join(__dirname, "ded-data.json");
const DEFAULT_PREFIX = "D.";

// ============================================================
// CLIENT
// ============================================================

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildModeration
  ],
  partials: [
    Partials.Channel,
    Partials.Message
  ]
});

// ============================================================
// DATA
// ============================================================

let data = {
  guilds: {}
};

if (fs.existsSync(DATA_FILE)) {
  try {
    data = JSON.parse(
      fs.readFileSync(DATA_FILE, "utf8")
    );
  } catch {
    data = {
      guilds: {}
    };
  }
}

function saveData() {
  fs.writeFileSync(
    DATA_FILE,
    JSON.stringify(data, null, 2)
  );
}

function getGuild(guildId) {
  if (!data.guilds[guildId]) {
    data.guilds[guildId] = {
      prefix: DEFAULT_PREFIX,
      logs: null,
      users: {}
    };

    saveData();
  }

  return data.guilds[guildId];
}

function getUser(guildId, userId) {
  const guild = getGuild(guildId);

  if (!guild.users[userId]) {
    guild.users[userId] = {
      balance: 0,
      cooldowns: {},
      warnings: []
    };

    saveData();
  }

  return guild.users[userId];
}

// ============================================================
// UTILIDADES
// ============================================================

function random(min, max) {
  return Math.floor(
    Math.random() * (max - min + 1)
  ) + min;
}

function money(amount) {
  return `${amount.toLocaleString("es-ES")} 🪙`;
}

function cooldown(user, command, time) {
  const now = Date.now();
  const last = user.cooldowns[command] || 0;

  const remaining =
    time - (now - last);

  if (remaining > 0) {
    return Math.ceil(remaining / 1000);
  }

  user.cooldowns[command] = now;

  return 0;
}

function timeText(seconds) {
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes =
    Math.floor(seconds / 60);

  const secs =
    seconds % 60;

  if (secs === 0) {
    return `${minutes}m`;
  }

  return `${minutes}m ${secs}s`;
}

// ============================================================
// EMBEDS
// ============================================================

function embed(title, description) {
  return new EmbedBuilder()
    .setColor(0x8b5cf6)
    .setTitle(`╭━━━〔 ${title} 〕━━━╮`)
    .setDescription(description)
    .setFooter({
      text: "🤖 Ded-bot • D.help"
    })
    .setTimestamp();
}

function success(title, description) {
  return new EmbedBuilder()
    .setColor(0x22c55e)
    .setTitle(`╭━━━〔 ✅ ${title} 〕━━━╮`)
    .setDescription(description)
    .setFooter({
      text: "🤖 Ded-bot"
    })
    .setTimestamp();
}

function error(title, description) {
  return new EmbedBuilder()
    .setColor(0xef4444)
    .setTitle(`╭━━━〔 ❌ ${title} 〕━━━╮`)
    .setDescription(description)
    .setFooter({
      text: "🤖 Ded-bot"
    })
    .setTimestamp();
}

function adminEmbed(title, description) {
  return new EmbedBuilder()
    .setColor(0xf59e0b)
    .setTitle(`╭━━━〔 👑 ${title} 〕━━━╮`)
    .setDescription(description)
    .setFooter({
      text: "👑 Ded-bot • Administración"
    })
    .setTimestamp();
}

// ============================================================
// LOGS
// ============================================================

async function sendLog(
  guild,
  title,
  description,
  color = 0xf59e0b
) {
  const config =
    getGuild(guild.id);

  if (!config.logs) return;

  const channel =
    guild.channels.cache.get(config.logs);

  if (!channel) return;

  const log = new EmbedBuilder()
    .setColor(color)
    .setTitle(`📋 ${title}`)
    .setDescription(description)
    .setFooter({
      text: "Ded-bot • Logs"
    })
    .setTimestamp();

  try {
    await channel.send({
      embeds: [log]
    });
  } catch {}
}

// ============================================================
// MENÚ PUBLICO
// ============================================================

function publicMenu() {
  return new ActionRowBuilder()
    .addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("ded_help")
        .setPlaceholder(
          "📂 Selecciona una categoría..."
        )
        .addOptions(

          new StringSelectMenuOptionBuilder()
            .setLabel("Economía")
            .setDescription(
              "Monedas y recompensas"
            )
            .setEmoji("💰")
            .setValue("economia"),

          new StringSelectMenuOptionBuilder()
            .setLabel("Diversión")
            .setDescription(
              "Minijuegos"
            )
            .setEmoji("🎮")
            .setValue("diversion"),

          new StringSelectMenuOptionBuilder()
            .setLabel("Social")
            .setDescription(
              "Comandos sociales"
            )
            .setEmoji("👥")
            .setValue("social"),

          new StringSelectMenuOptionBuilder()
            .setLabel("Utilidades")
            .setDescription(
              "Herramientas"
            )
            .setEmoji("🛠️")
            .setValue("utilidades"),

          new StringSelectMenuOptionBuilder()
            .setLabel("Información")
            .setDescription(
              "Información del bot"
            )
            .setEmoji("ℹ️")
            .setValue("info")
        )
    );
}

// ============================================================
// MENÚ ADMIN
// ============================================================

function adminMenu() {
  return new ActionRowBuilder()
    .addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("ded_admin")
        .setPlaceholder(
          "👑 Selecciona una categoría..."
        )
        .addOptions(

          new StringSelectMenuOptionBuilder()
            .setLabel("Moderación")
            .setDescription(
              "Herramientas administrativas"
            )
            .setEmoji("🛡️")
            .setValue("moderacion"),

          new StringSelectMenuOptionBuilder()
            .setLabel("Economía")
            .setDescription(
              "Administrar monedas"
            )
            .setEmoji("💰")
            .setValue("economia"),

          new StringSelectMenuOptionBuilder()
            .setLabel("Configuración")
            .setDescription(
              "Configurar Ded-bot"
            )
            .setEmoji("⚙️")
            .setValue("config"),

          new StringSelectMenuOptionBuilder()
            .setLabel("Servidor")
            .setDescription(
              "Información del servidor"
            )
            .setEmoji("🏠")
            .setValue("server"),

          new StringSelectMenuOptionBuilder()
            .setLabel("Información")
            .setDescription(
              "Información administrativa"
            )
            .setEmoji("ℹ️")
            .setValue("info")
        )
    );
}

// ============================================================
// READY
// ============================================================

client.once("ready", () => {

  console.log(
    "===================================="
  );

  console.log(
    "🤖 Ded-bot conectado correctamente"
  );

  console.log(
    `👤 ${client.user.tag}`
  );

  console.log(
    `🆔 ${client.user.id}`
  );

  console.log(
    "===================================="
  );

  client.user.setPresence({
    activities: [
      {
        name: "D.help",
        type: 0
      }
    ],
    status: "online"
  });
});

// ============================================================
// INTERACCIONES
// ============================================================

client.on(
  "interactionCreate",
  async interaction => {

    if (
      !interaction.isStringSelectMenu()
    ) return;

    // ========================================================
    // HELP PUBLICO
    // ========================================================

    if (
      interaction.customId === "ded_help"
    ) {

      const value =
        interaction.values[0];

      const pages = {

        economia: embed(
          "💰 ECONOMÍA",
          [
            "### 💵 RECOMPENSAS",
            "",
            "`D.work` → 200–500 🪙",
            "`D.crime` → 1000–2000 🪙",
            "`D.play` → hasta 3000 🪙",
            "`D.daily` → recompensa diaria",
            "`D.gift` → regalo aleatorio",
            "`D.search` → buscar monedas",
            "`D.fish` → pescar",
            "",
            "### 🎮 MINIJUEGOS",
            "",
            "`D.coinflip`",
            "`D.dice`",
            "`D.rps`",
            "`D.guess`",
            "`D.trivia`",
            "`D.balance`",
            "`D.profile`"
          ].join("\n")
        ),

        diversion: embed(
          "🎮 DIVERSIÓN",
          [
            "`D.play 1/2/3`",
            "`D.coinflip`",
            "`D.dice`",
            "`D.rps piedra/papel/tijera`",
            "`D.guess número`",
            "`D.trivia`",
            "`D.fish`"
          ].join("\n")
        ),

        social: embed(
          "👥 SOCIAL",
          [
            "`D.profile`",
            "`D.balance`",
            "",
            "👤 Consulta tu información",
            "💰 Consulta tus monedas"
          ].join("\n")
        ),

        utilidades: embed(
          "🛠️ UTILIDADES",
          [
            "`D.help`",
            "`D.balance`",
            "`D.profile`",
            "`D.serverinfo`",
            "`D.userinfo @usuario`"
          ].join("\n")
        ),

        info: embed(
          "ℹ️ INFORMACIÓN",
          [
            "🤖 **Ded-bot**",
            "",
            "🔰 Prefix inicial: `D.`",
            "⚡ Discord.js v14",
            "💾 Economía persistente",
            "📋 Sistema de logs",
            "",
            "👑 Administradores:",
            "`D.admin`"
          ].join("\n")
        )
      };

      await interaction.update({
        embeds: [
          pages[value]
        ],
        components: [
          publicMenu()
        ]
      });

      return;
    }

    // ========================================================
    // ADMIN
    // ========================================================

    if (
      interaction.customId === "ded_admin"
    ) {

      if (
        !interaction.member.permissions.has(
          PermissionsBitField.Flags.Administrator
        )
      ) {
        return interaction.reply({
          ephemeral: true,
          embeds: [
            error(
              "SIN PERMISOS",
              "❌ Necesitas permisos de Administrador."
            )
          ]
        });
      }

      const value =
        interaction.values[0];

      const pages = {

        moderacion: adminEmbed(
          "🛡️ MODERACIÓN",
          [
            "`D.kick @usuario`",
            "`D.ban @usuario`",
            "`D.timeout @usuario minutos`",
            "`D.untimeout @usuario`",
            "`D.warn @usuario razón`",
            "`D.warnings @usuario`",
            "`D.clear cantidad`",
            "",
            "⚠️ Cada comando comprueba sus permisos."
          ].join("\n")
        ),

        economia: adminEmbed(
          "💰 ECONOMÍA",
          [
            "`D.addmoney @usuario cantidad`",
            "`D.removemoney @usuario cantidad`",
            "`D.setmoney @usuario cantidad`",
            "`D.resetmoney @usuario`",
            "`D.leaderboard`"
          ].join("\n")
        ),

        config: adminEmbed(
          "⚙️ CONFIGURACIÓN",
          [
            "`D.prefix nuevoPrefix`",
            "`D.logs #canal`",
            "",
            "🔰 Cambia el prefix del servidor.",
            "📋 Configura los logs."
          ].join("\n")
        ),

        server: adminEmbed(
          "🏠 SERVIDOR",
          [
            "`D.serverinfo`",
            "`D.userinfo @usuario`",
            "",
            "ℹ️ Información del servidor."
          ].join("\n")
        ),

        info: adminEmbed(
          "ℹ️ ADMINISTRACIÓN",
          [
            "👑 Panel administrativo de Ded-bot.",
            "",
            "🛡️ Moderación",
            "💰 Economía",
            "⚙️ Configuración",
            "🏠 Servidor"
          ].join("\n")
        )
      };

      await interaction.update({
        embeds: [
          pages[value]
        ],
        components: [
          adminMenu()
        ]
      });
    }
  }
);

// ============================================================
// MENSAJES ELIMINADOS
// ============================================================

client.on(
  "messageDelete",
  async message => {

    if (!message.guild) return;

    if (message.author?.bot) return;

    await sendLog(
      message.guild,
      "🗑️ MENSAJE ELIMINADO",
      [
        `👤 Autor: ${message.author || "Desconocido"}`,
        `📍 Canal: ${message.channel}`,
        "",
        "💬 Contenido:",
        message.content || "*No disponible*"
      ].join("\n"),
      0xef4444
    );
  }
);

// ============================================================
// COMANDOS
// ============================================================

client.on(
  "messageCreate",
  async message => {

    if (!message.guild) return;
    if (message.author.bot) return;

    const config =
      getGuild(message.guild.id);

    const prefix =
      config.prefix || DEFAULT_PREFIX;

    if (
      !message.content.startsWith(prefix)
    ) return;

    const args =
      message.content
        .slice(prefix.length)
        .trim()
        .split(/\s+/);

    const command =
      args.shift()?.toLowerCase();

    if (!command) return;

    const user =
      getUser(
        message.guild.id,
        message.author.id
      );

    // ========================================================
    // HELP
    // ========================================================

    if (command === "help") {

      return message.channel.send({
        embeds: [
          embed(
            "🤖 DED-BOT",
            [
              "```",
              "╭────────────────────╮",
              "│      🤖 DED-BOT    │",
              "│    PANEL DE AYUDA  │",
              "╰────────────────────╯",
              "```",
              "",
              "✨ Selecciona una categoría.",
              "",
              "💰 Economía",
              "🎮 Diversión",
              "👥 Social",
              "🛠️ Utilidades",
              "ℹ️ Información",
              "",
              `🔰 Prefix: \`${prefix}\``
            ].join("\n")
          )
        ],
        components: [
          publicMenu()
        ]
      });
    }

    // ========================================================
    // ADMIN
    // ========================================================

    if (command === "admin") {

      if (
        !message.member.permissions.has(
          PermissionsBitField.Flags.Administrator
        )
      ) {
        return message.reply({
          embeds: [
            error(
              "SIN PERMISOS",
              "❌ Este panel es únicamente para administradores."
            )
          ]
        });
      }

      return message.channel.send({
        embeds: [
          adminEmbed(
            "👑 PANEL ADMIN",
            [
              "```",
              "╭────────────────────╮",
              "│    👑 DED-BOT      │",
              "│   ADMIN PANEL      │",
              "╰────────────────────╯",
              "```",
              "",
              "Selecciona una categoría."
            ].join("\n")
          )
        ],
        components: [
          adminMenu()
        ]
      });
    }

    // ========================================================
    // BALANCE
    // ========================================================

    if (
      command === "balance" ||
      command === "bal"
    ) {

      return message.channel.send({
        embeds: [
          embed(
            "💰 BALANCE",
            [
              `👤 ${message.author}`,
              "",
              `💎 Saldo: **${money(user.balance)}**`
            ].join("\n")
          )
        ]
      });
    }

    // ========================================================
    // WORK
    // ========================================================

    if (command === "work") {

      const remaining =
        cooldown(
          user,
          "work",
          20_000
        );

      if (remaining) {
        return message.reply({
          embeds: [
            error(
              "COOLDOWN",
              `⏳ Espera **${timeText(remaining)}**.`
            )
          ]
        });
      }

      const amount =
        random(200, 500);

      user.balance += amount;

      saveData();

      return message.channel.send({
        embeds: [
          success(
            "💼 WORK",
            [
              `👤 ${message.author}`,
              "",
              `💵 Ganaste **${money(amount)}**.`,
              "",
              `💰 Saldo: **${money(user.balance)}**`
            ].join("\n")
          )
        ]
      });
    }

    // ========================================================
    // CRIME
    // ========================================================

    if (command === "crime") {

      const remaining =
        cooldown(
          user,
          "crime",
          90_000
        );

      if (remaining) {
        return message.reply({
          embeds: [
            error(
              "COOLDOWN",
              `⏳ Espera **${timeText(remaining)}**.`
            )
          ]
        });
      }

      if (
        Math.random() > 0.10
      ) {

        saveData();

        return message.channel.send({
          embeds: [
            error(
              "🚨 CRIME",
              "❌ El intento falló.\n\nNo obtuviste recompensa."
            )
          ]
        });
      }

      const amount =
        random(1000, 2000);

      user.balance += amount;

      saveData();

      return message.channel.send({
        embeds: [
          success(
            "🚨 CRIME",
            `🎉 ¡Éxito!\n\n💰 Ganaste **${money(amount)}**.`
          )
        ]
      });
    }

    // ========================================================
    // PLAY
    // ========================================================

    if (command === "play") {

      if (!args[0]) {

        return message.reply({
          embeds: [
            embed(
              "🚪 PLAY",
              [
                "Elige una puerta:",
                "",
                "🚪 `1`",
                "🚪 `2`",
                "🚪 `3`",
                "",
                `Ejemplo: \`${prefix}play 2\``
              ].join("\n")
            )
          ]
        });
      }

      const remaining =
        cooldown(
          user,
          "play",
          120_000
        );

      if (remaining) {
        return message.reply({
          embeds: [
            error(
              "COOLDOWN",
              `⏳ Espera **${timeText(remaining)}**.`
            )
          ]
        });
      }

      const chosen =
        Number(args[0]);

      if (
        ![1, 2, 3].includes(chosen)
      ) {

        user.cooldowns.play = 0;

        return message.reply({
          embeds: [
            error(
              "PUERTA INCORRECTA",
              "❌ Debes elegir 1, 2 o 3."
            )
          ]
        });
      }

      const correct =
        random(1, 3);

      if (chosen === correct) {

        user.balance += 3000;

        saveData();

        return message.channel.send({
          embeds: [
            success(
              "🚪 PLAY",
              [
                "🎉 ¡Elegiste correctamente!",
                "",
                `🚪 Puerta: **${correct}**`,
                `💰 Premio: **${money(3000)}**`
              ].join("\n")
            )
          ]
        });
      }

      saveData();

      return message.channel.send({
        embeds: [
          error(
            "🚪 PLAY",
            [
              "❌ No era esa puerta.",
              "",
              `🔐 La correcta era: **${correct}**`
            ].join("\n")
          )
        ]
      });
    }

    // ========================================================
    // DAILY
    // ========================================================

    if (command === "daily") {

      const remaining =
        cooldown(
          user,
          "daily",
          86_400_000
        );

      if (remaining) {
        return message.reply({
          embeds: [
            error(
              "DAILY",
              `⏳ Vuelve en **${timeText(remaining)}**.`
            )
          ]
        });
      }

      const amount =
        random(1000, 2500);

      user.balance += amount;

      saveData();

      return message.channel.send({
        embeds: [
          success(
            "🎁 DAILY",
            `💰 Recompensa: **${money(amount)}**`
          )
        ]
      });
    }

    // ========================================================
    // GIFT
    // ========================================================

    if (command === "gift") {

      const remaining =
        cooldown(
          user,
          "gift",
          120_000
        );

      if (remaining) {
        return message.reply({
          embeds: [
            error(
              "GIFT",
              `⏳ Espera **${timeText(remaining)}**.`
            )
          ]
        });
      }

      const amount =
        random(100, 700);

      user.balance += amount;

      saveData();

      return message.channel.send({
        embeds: [
          success(
            "🎁 GIFT",
            `🎁 Encontraste **${money(amount)}**.`
          )
        ]
      });
    }

    // ========================================================
    // SEARCH
    // ========================================================

    if (command === "search") {

      const remaining =
        cooldown(
          user,
          "search",
          60_000
        );

      if (remaining) {
        return message.reply({
          embeds: [
            error(
              "SEARCH",
              `⏳ Espera **${timeText(remaining)}**.`
            )
          ]
        });
      }

      const amount =
        random(100, 800);

      user.balance += amount;

      saveData();

      return message.channel.send({
        embeds: [
          success(
            "🔎 SEARCH",
            `🔎 Encontraste **${money(amount)}**.`
          )
        ]
      });
    }

    // ========================================================
    // FISH
    // ========================================================

    if (command === "fish") {

      const catches = [
        ["🐟 Pez pequeño", 100],
        ["🐠 Pez tropical", 250],
        ["🐡 Pez raro", 450],
        ["🦈 Captura especial", 700]
      ];

      const caught =
        catches[
          random(0, catches.length - 1)
        ];

      user.balance += caught[1];

      saveData();

      return message.channel.send({
        embeds: [
          success(
            "🎣 FISH",
            [
              `🎣 Capturaste: **${caught[0]}**`,
              "",
              `💰 Recompensa: **${money(caught[1])}**`
            ].join("\n")
          )
        ]
      });
    }

    // ========================================================
    // COINFLIP
    // ========================================================

    if (command === "coinflip") {

      const result =
        Math.random() < 0.5
          ? "🪙 CARA"
          : "🪙 CRUZ";

      user.balance += 150;

      saveData();

      return message.channel.send({
        embeds: [
          embed(
            "🪙 COINFLIP",
            [
              `Resultado: **${result}**`,
              "",
              "🎁 Recompensa: **150 🪙**"
            ].join("\n")
          )
        ]
      });
    }

    // ========================================================
    // DICE
    // ========================================================

    if (command === "dice") {

      const result =
        random(1, 6);

      const reward =
        result * 50;

      user.balance += reward;

      saveData();

      return message.channel.send({
        embeds: [
          success(
            "🎲 DICE",
            [
              `🎲 Resultado: **${result}**`,
              "",
              `💰 Recompensa: **${money(reward)}**`
            ].join("\n")
          )
        ]
      });
    }

    // ========================================================
    // RPS
    // ========================================================

    if (command === "rps") {

      const choices = [
        "piedra",
        "papel",
        "tijera"
      ];

      const player =
        args[0]?.toLowerCase();

      if (
        !choices.includes(player)
      ) {

        return message.reply({
          embeds: [
            embed(
              "✊ RPS",
              [
                "Usa uno de estos:",
                "",
                "`piedra`",
                "`papel`",
                "`tijera`"
              ].join("\n")
            )
          ]
        });
      }

      const bot =
        choices[
          random(0, 2)
        ];

      let reward = 50;
      let result =
        "😅 El bot ganó.";

      if (player === bot) {

        reward = 100;
        result = "🤝 Empate.";

      } else if (
        (player === "piedra" &&
          bot === "tijera") ||
        (player === "papel" &&
          bot === "piedra") ||
        (player === "tijera" &&
          bot === "papel")
      ) {

        reward = 250;
        result = "🎉 ¡Ganaste!";
      }

      user.balance += reward;

      saveData();

      return message.channel.send({
        embeds: [
          embed(
            "✊ RPS",
            [
              `👤 Tú: **${player}**`,
              `🤖 Bot: **${bot}**`,
              "",
              result,
              `💰 Premio: **${money(reward)}**`
            ].join("\n")
          )
        ]
      });
    }

    // ========================================================
    // GUESS
    // ========================================================

    if (command === "guess") {

      const number =
        Number(args[0]);

      if (
        !Number.isInteger(number) ||
        number < 1 ||
        number > 10
      ) {

        return message.reply({
          embeds: [
            embed(
              "🔢 GUESS",
              `Adivina un número del **1 al 10**.\n\nEjemplo: \`${prefix}guess 7\``
            )
          ]
        });
      }

      const correct =
        random(1, 10);

      if (number === correct) {

        user.balance += 500;

        saveData();

        return message.channel.send({
          embeds: [
            success(
              "🔢 GUESS",
              `🎉 ¡Correcto!\n\n💰 Ganaste **${money(500)}**.`
            )
          ]
        });
      }

      return message.channel.send({
        embeds: [
          error(
            "🔢 GUESS",
            `❌ Fallaste.\n\nEl número era **${correct}**.`
          )
        ]
      });
    }

    // ========================================================
    // TRIVIA
    // ========================================================

    if (command === "trivia") {

      const questions = [
        {
          q: "¿Cuál es el planeta más grande?",
          a: "jupiter"
        },
        {
          q: "¿Cuántos días tiene una semana?",
          a: "7"
        },
        {
          q: "¿Cuál es la capital de España?",
          a: "madrid"
        }
      ];

      const question =
        questions[
          random(0, questions.length - 1)
        ];

      if (!args.length) {

        return message.channel.send({
          embeds: [
            embed(
              "🧠 TRIVIA",
              [
                question.q,
                "",
                `Responde: \`${prefix}trivia respuesta\``
              ].join("\n")
            )
          ]
        });
      }

      const answer =
        args.join(" ").toLowerCase();

      if (
        answer === question.a
      ) {

        user.balance += 600;

        saveData();

        return message.channel.send({
          embeds: [
            success(
              "🧠 TRIVIA",
              "🎉 ¡Respuesta correcta!\n\n💰 Ganaste **600 🪙**."
            )
          ]
        });
      }

      return message.channel.send({
        embeds: [
          error(
            "🧠 TRIVIA",
            `❌ Incorrecto.\n\nLa respuesta era **${question.a}**.`
          )
        ]
      });
    }

    // ========================================================
    // PROFILE
    // ========================================================

    if (command === "profile") {

      return message.channel.send({
        embeds: [
          embed(
            "👤 PERFIL",
            [
              `👤 Usuario: ${message.author}`,
              "",
              `💰 Monedas: **${money(user.balance)}**`,
              `⚠️ Warns: **${user.warnings.length}**`
            ].join("\n")
          )
        ]
      });
    }

    // ========================================================
    // SERVERINFO
    // ========================================================

    if (command === "serverinfo") {

      return message.channel.send({
        embeds: [
          embed(
            "🏠 SERVIDOR",
            [
              `🏠 Nombre: **${message.guild.name}**`,
              `👥 Miembros: **${message.guild.memberCount}**`,
              `📁 Canales: **${message.guild.channels.cache.size}**`,
              `🔰 Prefix: \`${prefix}\``
            ].join("\n")
          )
        ]
      });
    }

    // ========================================================
    // USERINFO
    // ========================================================

    if (command === "userinfo") {

      const target =
        message.mentions.members.first() ||
        message.member;

      const targetData =
        getUser(
          message.guild.id,
          target.id
        );

      return message.channel.send({
        embeds: [
          embed(
            "👤 USERINFO",
            [
              `👤 Usuario: **${target.user.tag}**`,
              `🆔 ID: \`${target.id}\``,
              `💰 Monedas: **${money(targetData.balance)}**`,
              `⚠️ Warns: **${targetData.warnings.length}**`
            ].join("\n")
          )
        ]
      });
    }

    // ========================================================
    // PREFIX
    // ========================================================

    if (command === "prefix") {

      if (
        !message.member.permissions.has(
          PermissionsBitField.Flags.Administrator
        )
      ) {
        return message.reply({
          embeds: [
            error(
              "SIN PERMISOS",
              "❌ Necesitas Administrador."
            )
          ]
        });
      }

      const newPrefix =
        args[0];

      if (
        !newPrefix ||
        newPrefix.length > 5
      ) {

        return message.reply({
          embeds: [
            embed(
              "⚙️ PREFIX",
              `Uso: \`${prefix}prefix !\``
            )
          ]
        });
      }

      const oldPrefix =
        config.prefix;

      config.prefix =
        newPrefix;

      saveData();

      await sendLog(
        message.guild,
        "⚙️ PREFIX CAMBIADO",
        [
          `👤 Admin: ${message.author}`,
          `🔴 Antes: \`${oldPrefix}\``,
          `🟢 Ahora: \`${newPrefix}\``
        ].join("\n")
      );

      return message.channel.send({
        embeds: [
          success(
            "PREFIX",
            [
              `🔴 Anterior: \`${oldPrefix}\``,
              `🟢 Nuevo: \`${newPrefix}\``
            ].join("\n")
          )
        ]
      });
    }

    // ========================================================
    // LOGS
    // ========================================================

    if (command === "logs") {

      if (
        !message.member.permissions.has(
          PermissionsBitField.Flags.Administrator
        )
      ) {
        return message.reply({
          embeds: [
            error(
              "SIN PERMISOS",
              "❌ Necesitas Administrador."
            )
          ]
        });
      }

      const channel =
        message.mentions.channels.first();

      if (!channel) {

        return message.reply({
          embeds: [
            embed(
              "📋 LOGS",
              `Uso: \`${prefix}logs #canal\``
            )
          ]
        });
      }

      config.logs =
        channel.id;

      saveData();

      return message.channel.send({
        embeds: [
          success(
            "📋 LOGS",
            `Los logs se enviarán en ${channel}.`
          )
        ]
      });
    }

    // ========================================================
    // ADD MONEY
    // ========================================================

    if (command === "addmoney") {

      if (
        !message.member.permissions.has(
          PermissionsBitField.Flags.Administrator
        )
      ) {
        return message.reply({
          embeds: [
            error(
              "SIN PERMISOS",
              "❌ Necesitas Administrador."
            )
          ]
        });
      }

      const target =
        message.mentions.users.first();

      const amount =
        Number(args[1]);

      if (
        !target ||
        !Number.isInteger(amount) ||
        amount <= 0
      ) {
        return message.reply({
          embeds: [
            embed(
              "💰 ADDMONEY",
              `Uso: \`${prefix}addmoney @usuario 1000\``
            )
          ]
        });
      }

      const targetUser =
        getUser(
          message.guild.id,
          target.id
        );

      targetUser.balance += amount;

      saveData();

      await sendLog(
        message.guild,
        "💰 DINERO AÑADIDO",
        [
          `👑 Admin: ${message.author}`,
          `👤 Usuario: ${target}`,
          `💵 Cantidad: **${money(amount)}**`
        ].join("\n")
      );

      return message.channel.send({
        embeds: [
          success(
            "DINERO AÑADIDO",
            `${target} recibió **${money(amount)}**.`
          )
        ]
      });
    }

    // ========================================================
    // REMOVE MONEY
    // ========================================================

    if (command === "removemoney") {

      if (
        !message.member.permissions.has(
          PermissionsBitField.Flags.Administrator
        )
      ) {
        return message.reply({
          embeds: [
            error(
              "SIN PERMISOS",
              "❌ Necesitas Administrador."
            )
          ]
        });
      }

      const target =
        message.mentions.users.first();

      const amount =
        Number(args[1]);

      if (
        !target ||
        !Number.isInteger(amount) ||
        amount <= 0
      ) {
        return message.reply({
          embeds: [
            embed(
              "💸 REMOVEMONEY",
              `Uso: \`${prefix}removemoney @usuario 1000\``
            )
          ]
        });
      }

      const targetUser =
        getUser(
          message.guild.id,
          target.id
        );

      targetUser.balance =
        Math.max(
          0,
          targetUser.balance - amount
        );

      saveData();

      return message.channel.send({
        embeds: [
          success(
            "DINERO RETIRADO",
            `${money(amount)} retiradas de ${target}.`
          )
        ]
      });
    }

    // ========================================================
    // SET MONEY
    // ========================================================

    if (command === "setmoney") {

      if (
        !message.member.permissions.has(
          PermissionsBitField.Flags.Administrator
        )
      ) {
        return message.reply({
          embeds: [
            error(
              "SIN PERMISOS",
              "❌ Necesitas Administrador."
            )
          ]
        });
      }

      const target =
        message.mentions.users.first();

      const amount =
        Number(args[1]);

      if (
        !target ||
        !Number.isInteger(amount) ||
        amount < 0
      ) {
        return message.reply({
          embeds: [
            embed(
              "💰 SETMONEY",
              `Uso: \`${prefix}setmoney @usuario 5000\``
            )
          ]
        });
      }

      const targetUser =
        getUser(
          message.guild.id,
          target.id
        );

      targetUser.balance =
        amount;

      saveData();

      return message.channel.send({
        embeds: [
          success(
            "SETMONEY",
            `${target} ahora tiene **${money(amount)}**.`
          )
        ]
      });
    }

    // ========================================================
    // RESET MONEY
    // ========================================================

    if (command === "resetmoney") {

      if (
        !message.member.permissions.has(
          PermissionsBitField.Flags.Administrator
        )
      ) {
        return message.reply({
          embeds: [
            error(
              "SIN PERMISOS",
              "❌ Necesitas Administrador."
            )
          ]
        });
      }

      const target =
        message.mentions.users.first();

      if (!target) {
        return message.reply({
          embeds: [
            embed(
              "RESETMONEY",
              `Uso: \`${prefix}resetmoney @usuario\``
            )
          ]
        });
      }

      const targetUser =
        getUser(
          message.guild.id,
          target.id
        );

      targetUser.balance = 0;

      saveData();

      return message.channel.send({
        embeds: [
          success(
            "RESETMONEY",
            `💰 El saldo de ${target} fue reiniciado.`
          )
        ]
      });
    }

    // ========================================================
    // LEADERBOARD
    // ========================================================

    if (
      command === "leaderboard" ||
      command === "lb"
    ) {

      const users =
        Object.entries(config.users)
          .sort(
            (a, b) =>
              b[1].balance -
              a[1].balance
          )
          .slice(0, 10);

      if (!users.length) {
        return message.channel.send({
          embeds: [
            embed(
              "🏆 LEADERBOARD",
              "Todavía no hay usuarios."
            )
          ]
        });
      }

      const lines =
        users.map(
          ([id, info], index) =>
            `**${index + 1}.** <@${id}> — ${money(info.balance)}`
        );

      return message.channel.send({
        embeds: [
          adminEmbed(
            "🏆 LEADERBOARD",
            lines.join("\n")
          )
        ]
      });
    }

    // ========================================================
    // KICK
    // ========================================================

    if (command === "kick") {

      if (
        !message.member.permissions.has(
          PermissionsBitField.Flags.KickMembers
        )
      ) {
        return message.reply({
          embeds: [
            error(
              "SIN PERMISOS",
              "❌ Necesitas permiso de expulsar miembros."
            )
          ]
        });
      }

      const target =
        message.mentions.members.first();

      if (!target) {
        return message.reply({
          embeds: [
            embed(
              "👢 KICK",
              `Uso: \`${prefix}kick @usuario razón\``
            )
          ]
        });
      }

      if (!target.kickable) {
        return message.reply({
          embeds: [
            error(
              "KICK",
              "❌ No puedo expulsar a ese usuario."
            )
          ]
        });
      }

      const reason =
        args.slice(1).join(" ") ||
        "Sin razón";

      await target.kick(reason);

      await sendLog(
        message.guild,
        "👢 KICK",
        [
          `👑 Moderador: ${message.author}`,
          `👤 Usuario: ${target.user.tag}`,
          `📝 Razón: ${reason}`
        ].join("\n")
      );

      return message.channel.send({
        embeds: [
          success(
            "👢 KICK",
            `${target.user.tag} fue expulsado.`
          )
        ]
      });
    }

    // ========================================================
    // BAN
    // ========================================================

    if (command === "ban") {

      if (
        !message.member.permissions.has(
          PermissionsBitField.Flags.BanMembers
        )
      ) {
        return message.reply({
          embeds: [
            error(
              "SIN PERMISOS",
              "❌ Necesitas permiso de banear miembros."
            )
          ]
        });
      }

      const target =
        message.mentions.members.first();

      if (!target) {
        return message.reply({
          embeds: [
            embed(
              "🔨 BAN",
              `Uso: \`${prefix}ban @usuario razón\``
            )
          ]
        });
      }

      if (!target.bannable) {
        return message.reply({
          embeds: [
            error(
              "BAN",
              "❌ No puedo banear a ese usuario."
            )
          ]
        });
      }

      const reason =
        args.slice(1).join(" ") ||
        "Sin razón";

      await target.ban({
        reason
      });

      await sendLog(
        message.guild,
        "🔨 BAN",
        [
          `👑 Moderador: ${message.author}`,
          `👤 Usuario: ${target.user.tag}`,
          `📝 Razón: ${reason}`
        ].join("\n")
      );

      return message.channel.send({
        embeds: [
          success(
            "🔨 BAN",
            `${target.user.tag} fue baneado.`
          )
        ]
      });
    }

    // ========================================================
    // TIMEOUT
    // ========================================================

    if (command === "timeout") {

      if (
        !message.member.permissions.has(
          PermissionsBitField.Flags.ModerateMembers
        )
      ) {
        return message.reply({
          embeds: [
            error(
              "SIN PERMISOS",
              "❌ Necesitas permiso de moderación."
            )
          ]
        });
      }

      const target =
        message.mentions.members.first();

      const minutes =
        Number(args[1]);

      if (
        !target ||
        !Number.isInteger(minutes) ||
        minutes < 1 ||
        minutes > 40320
      ) {
        return message.reply({
          embeds: [
            embed(
              "🔇 TIMEOUT",
              `Uso: \`${prefix}timeout @usuario minutos\``
            )
          ]
        });
      }

      if (!target.moderatable) {
        return message.reply({
          embeds: [
            error(
              "TIMEOUT",
              "❌ No puedo aplicar timeout a ese usuario."
            )
          ]
        });
      }

      const reason =
        args.slice(2).join(" ") ||
        "Sin razón";

      await target.timeout(
        minutes * 60 * 1000,
        reason
      );

      await sendLog(
        message.guild,
        "🔇 TIMEOUT",
        [
          `👑 Moderador: ${message.author}`,
          `👤 Usuario: ${target.user.tag}`,
          `⏱️ Duración: ${minutes} minutos`,
          `📝 Razón: ${reason}`
        ].join("\n")
      );

      return message.channel.send({
        embeds: [
          success(
            "🔇 TIMEOUT",
            `${target.user.tag} recibió timeout durante **${minutes} minutos**.`
          )
        ]
      });
    }

    // ========================================================
    // UNTIMEOUT
    // ========================================================

    if (command === "untimeout") {

      if (
        !message.member.permissions.has(
          PermissionsBitField.Flags.ModerateMembers
        )
      ) {
        return message.reply({
          embeds: [
            error(
              "SIN PERMISOS",
              "❌ Necesitas permiso de moderación."
            )
          ]
        });
      }

      const target =
        message.mentions.members.first();

      if (!target) {
        return message.reply({
          embeds: [
            embed(
              "🔊 UNTIMEOUT",
              `Uso: \`${prefix}untimeout @usuario\``
            )
          ]
        });
      }

      await target.timeout(null);

      return message.channel.send({
        embeds: [
          success(
            "🔊 UNTIMEOUT",
            `Se quitó el timeout a ${target.user.tag}.`
          )
        ]
      });
    }

    // ========================================================
    // WARN
    // ========================================================

    if (command === "warn") {

      if (
        !message.member.permissions.has(
          PermissionsBitField.Flags.ModerateMembers
        )
      ) {
        return message.reply({
          embeds: [
            error(
              "SIN PERMISOS",
              "❌ Necesitas permisos de moderación."
            )
          ]
        });
      }

      const target =
        message.mentions.users.first();

      if (!target) {
        return message.reply({
          embeds: [
            embed(
              "⚠️ WARN",
              `Uso: \`${prefix}warn @usuario razón\``
            )
          ]
        });
      }

      const reason =
        args.slice(1).join(" ") ||
        "Sin razón";

      const targetData =
        getUser(
          message.guild.id,
          target.id
        );

      targetData.warnings.push({
        reason,
        moderator:
          message.author.id,
        date:
          new Date().toISOString()
      });

      saveData();

      await sendLog(
        message.guild,
        "⚠️ WARN",
        [
          `👑 Moderador: ${message.author}`,
          `👤 Usuario: ${target}`,
          `📝 Razón: ${reason}`
        ].join("\n")
      );

      return message.channel.send({
        embeds: [
          success(
            "⚠️ WARN",
            `${target} recibió una advertencia.`
          )
        ]
      });
    }

    // ========================================================
    // WARNINGS
    // ========================================================

    if (
      command === "warnings" ||
      command === "warns"
    ) {

      if (
        !message.member.permissions.has(
          PermissionsBitField.Flags.ModerateMembers
        )
      ) {
        return message.reply({
          embeds: [
            error(
              "SIN PERMISOS",
              "❌ Necesitas permisos de moderación."
            )
          ]
        });
      }

      const target =
        message.mentions.users.first();

      if (!target) {
        return message.reply({
          embeds: [
            embed(
              "⚠️ WARNINGS",
              `Uso: \`${prefix}warnings @usuario\``
            )
          ]
        });
      }

      const targetData =
        getUser(
          message.guild.id,
          target.id
        );

      if (!targetData.warnings.length) {
        return message.channel.send({
          embeds: [
            embed(
              "⚠️ WARNINGS",
              `${target} no tiene advertencias.`
            )
          ]
        });
      }

      const list =
        targetData.warnings.map(
          (warn, index) =>
            `**${index + 1}.** ${warn.reason}`
        );

      return message.channel.send({
        embeds: [
          adminEmbed(
            "⚠️ WARNINGS",
            list.join("\n")
          )
        ]
      });
    }

    // ========================================================
    // CLEAR
    // ========================================================

    if (command === "clear") {

      if (
        !message.member.permissions.has(
          PermissionsBitField.Flags.ManageMessages
        )
      ) {
        return message.reply({
          embeds: [
            error(
              "SIN PERMISOS",
              "❌ Necesitas Gestionar mensajes."
            )
          ]
        });
      }

      const amount =
        Number(args[0]);

      if (
        !Number.isInteger(amount) ||
        amount < 1 ||
        amount > 100
      ) {
        return message.reply({
          embeds: [
            embed(
              "🧹 CLEAR",
              `Uso: \`${prefix}clear 10\``
            )
          ]
        });
      }

      const deleted =
        await message.channel.bulkDelete(
          amount,
          true
        );

      await sendLog(
        message.guild,
        "🧹 CLEAR",
        [
          `👑 Moderador: ${message.author}`,
          `📍 Canal: ${message.channel}`,
          `🗑️ Mensajes: ${deleted.size}`
        ].join("\n")
      );

      const msg =
        await message.channel.send({
          embeds: [
            success(
              "🧹 CLEAR",
              `Se eliminaron **${deleted.size} mensajes**.`
            )
          ]
        });

      setTimeout(
        () => msg.delete().catch(() => {}),
        5000
      );
    }
  }
});

// ============================================================
// ERRORES
// ============================================================

client.on(
  "error",
  error => {
    console.error(
      "❌ Discord Error:",
      error
    );
  }
);

process.on(
  "unhandledRejection",
  error => {
    console.error(
      "❌ Unhandled Rejection:",
      error
    );
  }
);

// ============================================================
// SERVIDOR PARA RENDER
// ============================================================

http
  .createServer(
    (req, res) => {

      res.writeHead(
        200,
        {
          "Content-Type":
            "text/plain; charset=utf-8"
        }
      );

      res.end(
        "🤖 Ded-bot está online."
      );
    }
  )
  .listen(
    PORT,
    "0.0.0.0",
    () => {
      console.log(
        `🌐 Puerto ${PORT} activo`
      );
    }
  );

// ============================================================
// LOGIN
// ============================================================

client.login(TOKEN);
