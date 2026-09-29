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
// 🌌 DED-BOT
// ============================================================

const TOKEN = process.env.DISCORD_TOKEN;
const PORT = process.env.PORT || 3000;
const DEFAULT_PREFIX = "D.";

const DATA_FILE = path.join(__dirname, "ded-data.json");

// ============================================================
// 🤖 CLIENT
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
        Partials.Message,
        Partials.Channel,
        Partials.GuildMember
    ]
});

// ============================================================
// 💾 DATOS
// ============================================================

let data = {
    guilds: {}
};

if (fs.existsSync(DATA_FILE)) {
    try {
        data = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
    } catch (error) {
        console.log("⚠️ No se pudo leer ded-data.json. Se creará uno nuevo.");
        data = {
            guilds: {}
        };
    }
}

function saveData() {
    try {
        fs.writeFileSync(
            DATA_FILE,
            JSON.stringify(data, null, 2)
        );
    } catch (error) {
        console.error("❌ Error guardando datos:", error);
    }
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
            money: 0,
            warnings: 0,
            inventory: [],
            lastDaily: 0,
            lastWork: 0,
            lastCrime: 0,
            lastPlay: 0,
            lastGift: 0,
            lastSearch: 0,
            lastFish: 0
        };

        saveData();
    }

    return guild.users[userId];
}

// ============================================================
// 🛠️ FUNCIONES
// ============================================================

const cooldowns = new Map();

function random(min, max) {
    return Math.floor(
        Math.random() * (max - min + 1)
    ) + min;
}

function formatMoney(amount) {
    return `${amount.toLocaleString("es-ES")} 💰`;
}

function cooldownKey(userId, command) {
    return `${userId}:${command}`;
}

function checkCooldown(userId, command, time) {
    const key = cooldownKey(userId, command);
    const now = Date.now();

    if (cooldowns.has(key)) {
        const expires = cooldowns.get(key);

        if (now < expires) {
            return Math.ceil((expires - now) / 1000);
        }
    }

    cooldowns.set(key, now + time);

    return 0;
}

function timeLeft(seconds) {
    if (seconds < 60) {
        return `${seconds}s`;
    }

    const minutes = Math.floor(seconds / 60);
    const remaining = seconds % 60;

    if (remaining === 0) {
        return `${minutes}m`;
    }

    return `${minutes}m ${remaining}s`;
}

function createEmbed(title, description) {
    return new EmbedBuilder()
        .setColor(0x9b59b6)
        .setTitle(title)
        .setDescription(description)
        .setTimestamp();
}

function isAdmin(member) {
    return member.permissions.has(
        PermissionsBitField.Flags.Administrator
    );
}

async function sendLog(guild, message) {
    const guildData = getGuild(guild.id);

    if (!guildData.logs) {
        return;
    }

    const channel = guild.channels.cache.get(
        guildData.logs
    );

    if (!channel) {
        return;
    }

    try {
        await channel.send({
            embeds: [
                createEmbed(
                    "📋 Registro",
                    message
                )
            ]
        });
    } catch (error) {
        console.log("⚠️ No se pudo enviar el log.");
    }
}

// ============================================================
// 📋 MENÚ PÚBLICO
// ============================================================

function publicMenu() {
    const menu = new StringSelectMenuBuilder()
        .setCustomId("ded_public_help")
        .setPlaceholder("🌌 Selecciona una categoría")
        .addOptions(
            new StringSelectMenuOptionBuilder()
                .setLabel("Economía")
                .setDescription("💰 Comandos de economía")
                .setValue("economia")
                .setEmoji("💰"),

            new StringSelectMenuOptionBuilder()
                .setLabel("Diversión")
                .setDescription("🎮 Juegos y entretenimiento")
                .setValue("diversion")
                .setEmoji("🎮"),

            new StringSelectMenuOptionBuilder()
                .setLabel("Social")
                .setDescription("👥 Comandos sociales")
                .setValue("social")
                .setEmoji("👥"),

            new StringSelectMenuOptionBuilder()
                .setLabel("Utilidades")
                .setDescription("🛠️ Herramientas")
                .setValue("utilidades")
                .setEmoji("🛠️"),

            new StringSelectMenuOptionBuilder()
                .setLabel("Información")
                .setDescription("📚 Información del servidor")
                .setValue("informacion")
                .setEmoji("📚")
        );

    return new ActionRowBuilder().addComponents(menu);
}

// ============================================================
// 🔐 MENÚ ADMIN
// ============================================================

function adminMenu() {
    const menu = new StringSelectMenuBuilder()
        .setCustomId("ded_admin_help")
        .setPlaceholder("🔐 Selecciona una categoría")
        .addOptions(
            new StringSelectMenuOptionBuilder()
                .setLabel("Economía")
                .setDescription("💰 Administración de economía")
                .setValue("admin_economia")
                .setEmoji("💰"),

            new StringSelectMenuOptionBuilder()
                .setLabel("Moderación")
                .setDescription("🛡️ Herramientas de moderación")
                .setValue("moderacion")
                .setEmoji("🛡️"),

            new StringSelectMenuOptionBuilder()
                .setLabel("Configuración")
                .setDescription("⚙️ Configuración del bot")
                .setValue("configuracion")
                .setEmoji("⚙️"),

            new StringSelectMenuOptionBuilder()
                .setLabel("Servidor")
                .setDescription("🏠 Administración del servidor")
                .setValue("servidor")
                .setEmoji("🏠"),

            new StringSelectMenuOptionBuilder()
                .setLabel("Información")
                .setDescription("📚 Información administrativa")
                .setValue("admin_informacion")
                .setEmoji("📚")
        );

    return new ActionRowBuilder().addComponents(menu);
}

// ============================================================
// 📜 AYUDA PÚBLICA
// ============================================================

function publicHelp(category) {
    const lists = {
        economia: [
            "**D.balance** — Ver tu dinero",
            "**D.work** — Trabajar",
            "**D.crime** — Intentar conseguir dinero",
            "**D.play** — Jugar por monedas",
            "**D.daily** — Recompensa diaria",
            "**D.gift** — Regalo aleatorio",
            "**D.search** — Buscar objetos",
            "**D.fish** — Pescar"
        ],

        diversion: [
            "**D.coinflip** — Cara o cruz",
            "**D.dice** — Lanzar un dado",
            "**D.rps** — Piedra, papel o tijera",
            "**D.guess** — Adivina el número",
            "**D.trivia** — Pregunta aleatoria"
        ],

        social: [
            "**D.profile** — Ver perfil",
            "**D.userinfo** — Información de usuario"
        ],

        utilidades: [
            "**D.help** — Mostrar ayuda",
            "**D.prefix** — Ver el prefijo"
        ],

        informacion: [
            "**D.serverinfo** — Información del servidor",
            "**D.leaderboard** — Ranking de dinero",
            "**D.profile** — Tu perfil"
        ]
    };

    return createEmbed(
        `🌌 Ded-bot • ${category.toUpperCase()}`,
        lists[category]
            ? lists[category].join("\n")
            : "❌ Categoría no encontrada."
    );
}

// ============================================================
// 🔐 AYUDA ADMIN
// ============================================================

function adminHelp(category) {
    const lists = {
        admin_economia: [
            "**D.addmoney @usuario cantidad** — Añadir dinero",
            "**D.removemoney @usuario cantidad** — Quitar dinero",
            "**D.setmoney @usuario cantidad** — Establecer dinero",
            "**D.resetmoney @usuario** — Reiniciar dinero",
            "**D.leaderboard** — Ver ranking"
        ],

        moderacion: [
            "**D.kick @usuario** — Expulsar usuario",
            "**D.ban @usuario** — Banear usuario",
            "**D.timeout @usuario minutos** — Silenciar",
            "**D.untimeout @usuario** — Quitar silencio",
            "**D.warn @usuario razón** — Advertencia",
            "**D.warnings @usuario** — Ver advertencias",
            "**D.clear cantidad** — Borrar mensajes"
        ],

        configuracion: [
            "**D.prefix nuevoPrefijo** — Cambiar prefijo",
            "**D.logs** — Configurar canal de logs"
        ],

        servidor: [
            "**D.serverinfo** — Información del servidor",
            "**D.userinfo @usuario** — Información de usuario"
        ],

        admin_informacion: [
            "**D.help** — Ayuda pública",
            "**D.admin** — Panel administrativo",
            "**D.leaderboard** — Ranking económico"
        ]
    };

    return createEmbed(
        `🔐 Ded-bot Admin • ${category}`,
        lists[category]
            ? lists[category].join("\n")
            : "❌ Categoría no encontrada."
    );
}

// ============================================================
// 🎛️ INTERACCIONES
// ============================================================

client.on("interactionCreate", async interaction => {
    if (!interaction.isStringSelectMenu()) {
        return;
    }

    if (interaction.customId === "ded_public_help") {
        const category = interaction.values[0];

        await interaction.update({
            embeds: [
                publicHelp(category)
            ],
            components: [
                publicMenu()
            ]
        });

        return;
    }

    if (interaction.customId === "ded_admin_help") {
        if (!isAdmin(interaction.member)) {
            await interaction.reply({
                content: "❌ Necesitas permisos de Administrador.",
                ephemeral: true
            });

            return;
        }

        const category = interaction.values[0];

        await interaction.update({
            embeds: [
                adminHelp(category)
            ],
            components: [
                adminMenu()
            ]
        });
    }
});

// ============================================================
// 👋 MIEMBRO ENTRA
// ============================================================

client.on("guildMemberAdd", async member => {
    await sendLog(
        member.guild,
        `👋 Entró **${member.user.tag}** al servidor.`
    );
});

// ============================================================
// 🚪 MIEMBRO SALE
// ============================================================

client.on("guildMemberRemove", async member => {
    await sendLog(
        member.guild,
        `🚪 Salió **${member.user.tag}** del servidor.`
    );
});

// ============================================================
// 🗑️ MENSAJE BORRADO
// ============================================================

client.on("messageDelete", async message => {
    if (!message.guild) {
        return;
    }

    if (message.author?.bot) {
        return;
    }

    await sendLog(
        message.guild,
        `🗑️ Mensaje eliminado de ${message.channel}.\n` +
        `👤 Autor: **${message.author?.tag || "Desconocido"}**`
    );
});

// ============================================================
// 💬 MENSAJES / COMANDOS
// ============================================================

client.on("messageCreate", async message => {
    if (!message.guild) {
        return;
    }

    if (message.author.bot) {
        return;
    }

    const guildData = getGuild(message.guild.id);

    const prefix = guildData.prefix || DEFAULT_PREFIX;

    if (!message.content.startsWith(prefix)) {
        return;
    }

    const args = message.content
        .slice(prefix.length)
        .trim()
        .split(/\s+/);

    const command = args.shift()?.toLowerCase();

    if (!command) {
        return;
    }

    const userData = getUser(
        message.guild.id,
        message.author.id
    );

    // ========================================================
    // 📚 HELP
    // ========================================================

    if (command === "help") {
        await message.reply({
            embeds: [
                createEmbed(
                    "🌌 Ded-bot • Ayuda",
                    `Usa el menú de abajo para ver los comandos.\n\n` +
                    `⚡ Prefijo actual: \`${prefix}\``
                )
            ],
            components: [
                publicMenu()
            ]
        });

        return;
    }

    // ========================================================
    // 🔐 ADMIN
    // ========================================================

    if (command === "admin") {
        if (!isAdmin(message.member)) {
            await message.reply(
                "❌ Necesitas permisos de Administrador."
            );

            return;
        }

        await message.reply({
            embeds: [
                createEmbed(
                    "🔐 Ded-bot • Panel Administrativo",
                    "Selecciona una categoría para administrar el bot."
                )
            ],
            components: [
                adminMenu()
            ]
        });

        return;
    }

    // ========================================================
    // 💰 BALANCE
    // ========================================================

    if (command === "balance" || command === "bal") {
        await message.reply({
            embeds: [
                createEmbed(
                    "💰 Tu balance",
                    `Tienes **${formatMoney(userData.money)}**.`
                )
            ]
        });

        return;
    }

    // ========================================================
    // 💼 WORK
    // ========================================================

    if (command === "work") {
        const remaining = checkCooldown(
            message.author.id,
            "work",
            20 * 1000
        );

        if (remaining) {
            await message.reply(
                `⏳ Debes esperar **${timeLeft(remaining)}**.`
            );

            return;
        }

        const earned = random(200, 500);

        userData.money += earned;
        saveData();

        await message.reply({
            embeds: [
                createEmbed(
                    "💼 Trabajo completado",
                    `Trabajaste y ganaste **${formatMoney(earned)}**.\n\n` +
                    `💰 Balance: **${formatMoney(userData.money)}**`
                )
            ]
        });

        return;
    }

    // ========================================================
    // 🕵️ CRIME
    // ========================================================

    if (command === "crime") {
        const remaining = checkCooldown(
            message.author.id,
            "crime",
            90 * 1000
        );

        if (remaining) {
            await message.reply(
                `⏳ Debes esperar **${timeLeft(remaining)}**.`
            );

            return;
        }

        const success = Math.random() < 0.10;

        if (success) {
            const earned = random(1000, 2000);

            userData.money += earned;

            await message.reply({
                embeds: [
                    createEmbed(
                        "🕵️ ¡Éxito!",
                        `Conseguiste **${formatMoney(earned)}**.`
                    )
                ]
            });
        } else {
            const lost = Math.min(1000, userData.money);

            userData.money -= lost;

            await message.reply({
                embeds: [
                    createEmbed(
                        "🚨 Fallaste",
                        `Perdiste **${formatMoney(lost)}**.`
                    )
                ]
            });
        }

        saveData();

        return;
    }

    // ========================================================
    // 🎮 PLAY
    // ========================================================

    if (command === "play") {
        const remaining = checkCooldown(
            message.author.id,
            "play",
            2 * 60 * 1000
        );

        if (remaining) {
            await message.reply(
                `⏳ Debes esperar **${timeLeft(remaining)}**.`
            );

            return;
        }

        const winningDoor = random(1, 3);
        const chosenDoor = random(1, 3);

        if (chosenDoor === winningDoor) {
            userData.money += 3000;

            await message.reply({
                embeds: [
                    createEmbed(
                        "🚪 ¡Puerta correcta!",
                        `Ganaste **3.000 💰**.`
                    )
                ]
            });
        } else {
            const lost = Math.min(2000, userData.money);

            userData.money -= lost;

            await message.reply({
                embeds: [
                    createEmbed(
                        "🚪 Puerta equivocada",
                        `Perdiste **${formatMoney(lost)}**.`
                    )
                ]
            });
        }

        saveData();

        return;
    }

    // ========================================================
    // 🎁 DAILY
    // ========================================================

    if (command === "daily") {
        const now = Date.now();
        const cooldown = 24 * 60 * 60 * 1000;

        if (now - userData.lastDaily < cooldown) {
            const remaining = Math.ceil(
                (cooldown - (now - userData.lastDaily)) / 1000
            );

            await message.reply(
                `⏳ Ya reclamaste tu recompensa. Vuelve en **${timeLeft(remaining)}**.`
            );

            return;
        }

        const reward = random(1000, 2500);

        userData.money += reward;
        userData.lastDaily = now;

        saveData();

        await message.reply({
            embeds: [
                createEmbed(
                    "🎁 Recompensa diaria",
                    `Recibiste **${formatMoney(reward)}**.`
                )
            ]
        });

        return;
    }

    // ========================================================
    // 🎁 GIFT
    // ========================================================

    if (command === "gift") {
        const remaining = checkCooldown(
            message.author.id,
            "gift",
            2 * 60 * 1000
        );

        if (remaining) {
            await message.reply(
                `⏳ Debes esperar **${timeLeft(remaining)}**.`
            );

            return;
        }

        const reward = random(100, 800);

        userData.money += reward;
        saveData();

        await message.reply({
            embeds: [
                createEmbed(
                    "🎁 Regalo",
                    `Encontraste un regalo con **${formatMoney(reward)}**.`
                )
            ]
        });

        return;
    }

    // ========================================================
    // 🔎 SEARCH
    // ========================================================

    if (command === "search") {
        const remaining = checkCooldown(
            message.author.id,
            "search",
            60 * 1000
        );

        if (remaining) {
            await message.reply(
                `⏳ Debes esperar **${timeLeft(remaining)}**.`
            );

            return;
        }

        const reward = random(50, 500);

        userData.money += reward;
        saveData();

        await message.reply({
            embeds: [
                createEmbed(
                    "🔎 Búsqueda",
                    `Encontraste **${formatMoney(reward)}**.`
                )
            ]
        });

        return;
    }

    // ========================================================
    // 🎣 FISH
    // ========================================================

    if (command === "fish") {
        const remaining = checkCooldown(
            message.author.id,
            "fish",
            60 * 1000
        );

        if (remaining) {
            await message.reply(
                `⏳ Debes esperar **${timeLeft(remaining)}**.`
            );

            return;
        }

        const reward = random(100, 700);

        userData.money += reward;
        saveData();

        await message.reply({
            embeds: [
                createEmbed(
                    "🎣 Pesca",
                    `Pescaste algo y recibiste **${formatMoney(reward)}**.`
                )
            ]
        });

        return;
    }

    // ========================================================
    // 🪙 COINFLIP
    // ========================================================

    if (command === "coinflip") {
        const result = Math.random() < 0.5
            ? "🪙 Cara"
            : "🪙 Cruz";

        await message.reply({
            embeds: [
                createEmbed(
                    "🪙 Coinflip",
                    `El resultado fue **${result}**.`
                )
            ]
        });

        return;
    }

    // ========================================================
    // 🎲 DICE
    // ========================================================

    if (command === "dice") {
        const result = random(1, 6);

        await message.reply({
            embeds: [
                createEmbed(
                    "🎲 Dado",
                    `Sacaste un **${result}**.`
                )
            ]
        });

        return;
    }

    // ========================================================
    // ✊ RPS
    // ========================================================

    if (command === "rps") {
        const options = [
            "Piedra",
            "Papel",
            "Tijera"
        ];

        const result =
            options[random(0, options.length - 1)];

        await message.reply({
            embeds: [
                createEmbed(
                    "✊ Piedra, papel o tijera",
                    `Ded-bot eligió **${result}**.`
                )
            ]
        });

        return;
    }

    // ========================================================
    // 🔢 GUESS
    // ========================================================

    if (command === "guess") {
        const number = random(1, 10);

        await message.reply({
            embeds: [
                createEmbed(
                    "🔢 Adivinanza",
                    `El número secreto era **${number}**.`
                )
            ]
        });

        return;
    }

    // ========================================================
    // 🧠 TRIVIA
    // ========================================================

    if (command === "trivia") {
        const questions = [
            {
                q: "¿Cuál es el planeta más grande del Sistema Solar?",
                a: "Júpiter"
            },
            {
                q: "¿Cuántos lados tiene un triángulo?",
                a: "3"
            },
            {
                q: "¿Cuál es la capital de España?",
                a: "Madrid"
            }
        ];

        const question =
            questions[random(0, questions.length - 1)];

        await message.reply({
            embeds: [
                createEmbed(
                    "🧠 Trivia",
                    `**Pregunta:** ${question.q}\n\n` +
                    `💡 Respuesta: ||${question.a}||`
                )
            ]
        });

        return;
    }

    // ========================================================
    // 👤 PROFILE
    // ========================================================

    if (command === "profile") {
        await message.reply({
            embeds: [
                createEmbed(
                    "👤 Perfil",
                    `👤 Usuario: ${message.author}\n` +
                    `💰 Dinero: **${formatMoney(userData.money)}**\n` +
                    `⚠️ Advertencias: **${userData.warnings}**`
                )
            ]
        });

        return;
    }

    // ========================================================
    // 👤 USERINFO
    // ========================================================

    if (command === "userinfo") {
        const member =
            message.mentions.members.first() ||
            message.member;

        await message.reply({
            embeds: [
                createEmbed(
                    "👤 Información",
                    `👤 Usuario: ${member.user.tag}\n` +
                    `🆔 ID: \`${member.id}\`\n` +
                    `📅 Entró: <t:${Math.floor(member.joinedTimestamp / 1000)}:R>`
                )
            ]
        });

        return;
    }

    // ========================================================
    // 🏠 SERVERINFO
    // ========================================================

    if (command === "serverinfo") {
        await message.reply({
            embeds: [
                createEmbed(
                    "🏠 Información del servidor",
                    `🏠 Nombre: **${message.guild.name}**\n` +
                    `👥 Miembros: **${message.guild.memberCount}**\n` +
                    `🆔 ID: \`${message.guild.id}\``
                )
            ]
        });

        return;
    }

    // ========================================================
    // 🏆 LEADERBOARD
    // ========================================================

    if (command === "leaderboard" || command === "lb") {
        const users = Object.entries(guildData.users)
            .sort((a, b) => b[1].money - a[1].money)
            .slice(0, 10);

        if (users.length === 0) {
            await message.reply("📭 Todavía no hay datos.");

            return;
        }

        let text = "";

        for (let i = 0; i < users.length; i++) {
            const [userId, info] = users[i];

            const member =
                message.guild.members.cache.get(userId);

            const name =
                member?.user.username || "Usuario";

            text += `${i + 1}. **${name}** — ${formatMoney(info.money)}\n`;
        }

        await message.reply({
            embeds: [
                createEmbed(
                    "🏆 Leaderboard",
                    text
                )
            ]
        });

        return;
    }

    // ========================================================
    // ⚙️ PREFIX
    // ========================================================

    if (command === "prefix") {
        if (!isAdmin(message.member)) {
            await message.reply(
                "❌ Necesitas permisos de Administrador."
            );

            return;
        }

        const newPrefix = args[0];

        if (!newPrefix) {
            await message.reply(
                `⚡ Prefijo actual: \`${prefix}\``
            );

            return;
        }

        if (newPrefix.length > 5) {
            await message.reply(
                "❌ El prefijo no puede tener más de 5 caracteres."
            );

            return;
        }

        guildData.prefix = newPrefix;
        saveData();

        await message.reply(
            `✅ El nuevo prefijo es \`${newPrefix}\`.`
        );

        await sendLog(
            message.guild,
            `⚙️ ${message.author.tag} cambió el prefijo a \`${newPrefix}\`.`
        );

        return;
    }

    // ========================================================
    // 📋 LOGS
    // ========================================================

    if (command === "logs") {
        if (!isAdmin(message.member)) {
            await message.reply(
                "❌ Necesitas permisos de Administrador."
            );

            return;
        }

        const channel =
            message.mentions.channels.first();

        if (!channel) {
            await message.reply(
                "❌ Menciona el canal donde quieres recibir los logs."
            );

            return;
        }

        guildData.logs = channel.id;
        saveData();

        await message.reply(
            `✅ Los logs se enviarán en ${channel}.`
        );

        await sendLog(
            message.guild,
            `📋 Sistema de logs configurado por ${message.author.tag}.`
        );

        return;
    }

    // ========================================================
    // 💰 ADD MONEY
    // ========================================================

    if (command === "addmoney") {
        if (!isAdmin(message.member)) {
            await message.reply(
                "❌ Necesitas permisos de Administrador."
            );

            return;
        }

        const member =
            message.mentions.members.first();

        const amount =
            parseInt(args[1]);

        if (!member || isNaN(amount) || amount <= 0) {
            await message.reply(
                "❌ Uso: `D.addmoney @usuario cantidad`"
            );

            return;
        }

        const target =
            getUser(message.guild.id, member.id);

        target.money += amount;

        saveData();

        await message.reply(
            `✅ Se añadieron **${formatMoney(amount)}** a ${member}.`
        );

        return;
    }

    // ========================================================
    // 💰 REMOVE MONEY
    // ========================================================

    if (command === "removemoney") {
        if (!isAdmin(message.member)) {
            await message.reply(
                "❌ Necesitas permisos de Administrador."
            );

            return;
        }

        const member =
            message.mentions.members.first();

        const amount =
            parseInt(args[1]);

        if (!member || isNaN(amount) || amount <= 0) {
            await message.reply(
                "❌ Uso: `D.removemoney @usuario cantidad`"
            );

            return;
        }

        const target =
            getUser(message.guild.id, member.id);

        target.money = Math.max(
            0,
            target.money - amount
        );

        saveData();

        await message.reply(
            `✅ Se quitaron **${formatMoney(amount)}** a ${member}.`
        );

        return;
    }

    // ========================================================
    // 💰 SET MONEY
    // ========================================================

    if (command === "setmoney") {
        if (!isAdmin(message.member)) {
            await message.reply(
                "❌ Necesitas permisos de Administrador."
            );

            return;
        }

        const member =
            message.mentions.members.first();

        const amount =
            parseInt(args[1]);

        if (!member || isNaN(amount) || amount < 0) {
            await message.reply(
                "❌ Uso: `D.setmoney @usuario cantidad`"
            );

            return;
        }

        const target =
            getUser(message.guild.id, member.id);

        target.money = amount;

        saveData();

        await message.reply(
            `✅ El balance de ${member} ahora es **${formatMoney(amount)}**.`
        );

        return;
    }

    // ========================================================
    // 🔄 RESET MONEY
    // ========================================================

    if (command === "resetmoney") {
        if (!isAdmin(message.member)) {
            await message.reply(
                "❌ Necesitas permisos de Administrador."
            );

            return;
        }

        const member =
            message.mentions.members.first();

        if (!member) {
            await message.reply(
                "❌ Uso: `D.resetmoney @usuario`"
            );

            return;
        }

        const target =
            getUser(message.guild.id, member.id);

        target.money = 0;

        saveData();

        await message.reply(
            `✅ Se reinició el dinero de ${member}.`
        );

        return;
    }

    // ========================================================
    // 👢 KICK
    // ========================================================

    if (command === "kick") {
        if (!message.member.permissions.has(
            PermissionsBitField.Flags.KickMembers
        )) {
            await message.reply(
                "❌ No tienes permiso para expulsar miembros."
            );

            return;
        }

        const member =
            message.mentions.members.first();

        if (!member) {
            await message.reply(
                "❌ Uso: `D.kick @usuario`"
            );

            return;
        }

        if (!member.kickable) {
            await message.reply(
                "❌ No puedo expulsar a ese usuario."
            );

            return;
        }

        await member.kick();

        await message.reply(
            `👢 **${member.user.tag}** fue expulsado.`
        );

        await sendLog(
            message.guild,
            `👢 ${message.author.tag} expulsó a ${member.user.tag}.`
        );

        return;
    }

    // ========================================================
    // 🔨 BAN
    // ========================================================

    if (command === "ban") {
        if (!message.member.permissions.has(
            PermissionsBitField.Flags.BanMembers
        )) {
            await message.reply(
                "❌ No tienes permiso para banear miembros."
            );

            return;
        }

        const member =
            message.mentions.members.first();

        if (!member) {
            await message.reply(
                "❌ Uso: `D.ban @usuario`"
            );

            return;
        }

        if (!member.bannable) {
            await message.reply(
                "❌ No puedo banear a ese usuario."
            );

            return;
        }

        await member.ban();

        await message.reply(
            `🔨 **${member.user.tag}** fue baneado.`
        );

        await sendLog(
            message.guild,
            `🔨 ${message.author.tag} baneó a ${member.user.tag}.`
        );

        return;
    }

    // ========================================================
    // 🔇 TIMEOUT
    // ========================================================

    if (command === "timeout") {
        if (!message.member.permissions.has(
            PermissionsBitField.Flags.ModerateMembers
        )) {
            await message.reply(
                "❌ No tienes permiso para usar timeout."
            );

            return;
        }

        const member =
            message.mentions.members.first();

        const minutes =
            parseInt(args[1]);

        if (!member || isNaN(minutes) || minutes <= 0) {
            await message.reply(
                "❌ Uso: `D.timeout @usuario minutos`"
            );

            return;
        }

        await member.timeout(
            minutes * 60 * 1000
        );

        await message.reply(
            `🔇 ${member} recibió timeout durante **${minutes} minutos**.`
        );

        await sendLog(
            message.guild,
            `🔇 ${message.author.tag} aplicó timeout a ${member.user.tag} durante ${minutes} minutos.`
        );

        return;
    }

    // ========================================================
    // 🔊 UNTIMEOUT
    // ========================================================

    if (command === "untimeout") {
        if (!message.member.permissions.has(
            PermissionsBitField.Flags.ModerateMembers
        )) {
            await message.reply(
                "❌ No tienes permiso para quitar timeouts."
            );

            return;
        }

        const member =
            message.mentions.members.first();

        if (!member) {
            await message.reply(
                "❌ Uso: `D.untimeout @usuario`"
            );

            return;
        }

        await member.timeout(null);

        await message.reply(
            `🔊 Se quitó el timeout de ${member}.`
        );

        return;
    }

    // ========================================================
    // ⚠️ WARN
    // ========================================================

    if (command === "warn") {
        if (!message.member.permissions.has(
            PermissionsBitField.Flags.ModerateMembers
        )) {
            await message.reply(
                "❌ No tienes permiso para advertir usuarios."
            );

            return;
        }

        const member =
            message.mentions.members.first();

        if (!member) {
            await message.reply(
                "❌ Uso: `D.warn @usuario razón`"
            );

            return;
        }

        const reason =
            args.slice(1).join(" ") ||
            "Sin razón especificada";

        const target =
            getUser(message.guild.id, member.id);

        target.warnings++;

        saveData();

        await message.reply(
            `⚠️ ${member} recibió una advertencia.\n` +
            `📝 Razón: **${reason}**\n` +
            `⚠️ Total: **${target.warnings}**`
        );

        await sendLog(
            message.guild,
            `⚠️ ${message.author.tag} advirtió a ${member.user.tag}.\nRazón: ${reason}`
        );

        return;
    }

    // ========================================================
    // ⚠️ WARNINGS
    // ========================================================

    if (command === "warnings" || command === "warns") {
        if (!message.member.permissions.has(
            PermissionsBitField.Flags.ModerateMembers
        )) {
            await message.reply(
                "❌ No tienes permiso para ver advertencias."
            );

            return;
        }

        const member =
            message.mentions.members.first();

        if (!member) {
            await message.reply(
                "❌ Menciona un usuario."
            );

            return;
        }

        const target =
            getUser(message.guild.id, member.id);

        await message.reply(
            `⚠️ **${member.user.tag}** tiene **${target.warnings} advertencias**.`
        );

        return;
    }

    // ========================================================
    // 🧹 CLEAR
    // ========================================================

    if (command === "clear") {
        if (!message.member.permissions.has(
            PermissionsBitField.Flags.ManageMessages
        )) {
            await message.reply(
                "❌ No tienes permiso para borrar mensajes."
            );

            return;
        }

        const amount =
            parseInt(args[0]);

        if (
            isNaN(amount) ||
            amount < 1 ||
            amount > 100
        ) {
            await message.reply(
                "❌ Usa una cantidad entre 1 y 100."
            );

            return;
        }

        await message.channel.bulkDelete(
            amount,
            true
        );

        const response =
            await message.channel.send(
                `🧹 Se eliminaron **${amount} mensajes**.`
            );

        setTimeout(() => {
            response.delete().catch(() => {});
        }, 3000);

        await sendLog(
            message.guild,
            `🧹 ${message.author.tag} eliminó ${amount} mensajes en ${message.channel}.`
        );

        return;
    }
});

// ============================================================
// 🌐 SERVIDOR HTTP PARA RENDER
// ============================================================

const server = http.createServer((req, res) => {
    res.writeHead(200, {
        "Content-Type": "text/plain"
    });

    res.end("🌌 Ded-bot está funcionando.");
});

server.listen(PORT, () => {
    console.log(`🌐 Servidor HTTP activo en el puerto ${PORT}`);
});

// ============================================================
// 🤖 READY
// ============================================================

client.once("ready", () => {
    console.log("====================================");
    console.log(`🌌 ${client.user.tag} está conectado.`);
    console.log(`⚡ Prefijo: ${DEFAULT_PREFIX}`);
    console.log("====================================");

    client.user.setPresence({
        activities: [
            {
                name: "D.help 🌌",
                type: 0
            }
        ],
        status: "online"
    });
});

// ============================================================
// ❌ ERRORES
// ============================================================

process.on("unhandledRejection", error => {
    console.error("❌ Unhandled Rejection:", error);
});

process.on("uncaughtException", error => {
    console.error("❌ Uncaught Exception:", error);
});

// ============================================================
// 🔑 LOGIN
// ============================================================

if (!TOKEN) {
    console.error(
        "❌ No se encontró DISCORD_TOKEN en las variables de entorno."
    );
    process.exit(1);
}

client.login(TOKEN);
