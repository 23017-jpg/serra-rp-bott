require('dotenv').config();
const express = require('express');
const { 
  Client, 
  GatewayIntentBits, 
  EmbedBuilder, 
  ActionRowBuilder, 
  StringSelectMenuBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  PermissionFlagsBits, 
  ChannelType,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  REST,
  Routes,
  SlashCommandBuilder,
  AttachmentBuilder
} = require('discord.js');

// ==================== SERVIDOR WEB PARA O RENDER ====================
const app = express();
app.get('/', (req, res) => {
  res.send('🤖 Bot do Manchester RP está online e ativo!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🌐 Servidor HTTP a rodar na porta ${PORT}`);
});
// ====================================================================

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessageReactions,
  ],
});

// ==================== CONFIGURAÇÕES ====================
const CONFIG = {
  CEO_ROLE_ID: '000000000000000000', // Substitui pelo ID real do cargo CEO
  STAFF_ROLE_ID: '1529095834958823515', 
  MEMBER_ROLE_ID: '1529095879817166888',
  
  // ID do canal onde os ficheiros de Transcript serão guardados
  TRANSCRIPT_CHANNEL_ID: '000000000000000000', // Substitui pelo ID do canal #transcripts

  LOGO_URL: 'https://media.discordapp.net/attachments/1529563398772101190/1529921090170785933/image.png',

  CATEGORIES: {
    unban: '1529095995164459059',
    report_player: '1529096009249198200',
    vip: '1529095994279596224',
    orgs: '1529096003171385414',
    other: '152909588294193233',
    bugs: '1529096001749647483',
    report_org: '1529096018254233670',
    streamer: '1529096010163552276'
  }
};

let ticketCounter = 5819;
let sugestaoCounter = 1;

// Memória temporária para guardar os participantes dos giveaways
const activeGiveaways = new Map();
// =======================================================

const commands = [
  new SlashCommandBuilder().setName('tickets').setDescription('Envia o painel de tickets (Apenas CEO)'),
  new SlashCommandBuilder().setName('sugestoes-setup').setDescription('Envia o painel fixo da Central de Sugestões (Apenas CEO)'),
  new SlashCommandBuilder().setName('sugerir').setDescription('Envia uma sugestão para o Manchester RP')
    .addStringOption(option => option.setName('ideia').setDescription('Descreve a tua sugestão').setRequired(true)),
  new SlashCommandBuilder().setName('giveaway').setDescription('Inicia um Giveaway/Sorteio no canal (Apenas Staff)')
    .addStringOption(option => option.setName('premio').setDescription('O que vai ser sorteado?').setRequired(true))
    .addStringOption(option => option.setName('duracao').setDescription('Escolhe a duração do sorteio').setRequired(true)
      .addChoices(
        { name: '⚡ 10 Segundos (Teste)', value: '10s' },
        { name: '⏱️ 1 Hora', value: '1h' },
        { name: '⏱️ 2 Horas', value: '2h' },
        { name: '⏱️ 3 Horas', value: '3h' },
        { name: '⏱️ 10 Horas', value: '10h' },
        { name: '📅 Amanhã (24 Horas)', value: '24h' }
      )
    )
    .addIntegerOption(option => option.setName('ganhadores').setDescription('Número de vencedores (padrão: 1)').setRequired(false))
].map(command => command.toJSON());

client.once('clientReady', async () => {
  console.clear();
  console.log(`🤖 Bot online como ${client.user.tag}!`);

  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  try {
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    console.log('✅ Slash Commands registados com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao registar Slash Commands:', error);
  }
});

client.on('guildMemberAdd', async (member) => {
  try { await member.roles.add(CONFIG.MEMBER_ROLE_ID); } catch (err) {}
});

client.on('interactionCreate', async (interaction) => {

  // A) COMANDOS SLASH
  if (interaction.isChatInputCommand()) {
    
    // COMANDO TICKETS
    if (interaction.commandName === 'tickets') {
      if (!interaction.member.roles.cache.has(CONFIG.CEO_ROLE_ID) && !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({ content: '❌ Apenas membros com o cargo de **CEO** podem executar este comando.', ephemeral: true });
      }

      const embed = new EmbedBuilder()
        .setTitle('🎟️ Central de Tickets')
        .setDescription(
          'Escolhe o tipo de ticket no menu abaixo.\n\n' +
          '⛔ **Unbans** — Abre ticket para unbans\n' +
          '🚔 **Report de Jogador** — Denunciar jogadores\n' +
          '💎 **VIPS** — Abre ticket para adquirir o teu VIP\n' +
          '📦 **Organizações** — Abre ticket para falar de organizações\n' +
          '🌐 **Outros** — Abre ticket para assuntos gerais\n' +
          '⚙️ **Report Bugs** — Abre ticket para reportar bugs\n' +
          '🔫 **Report Organização** — Abre ticket para reportar organização\n' +
          '📷 **Candidatura Streamer** — Abre ticket para te candidatares a streamer\n\n' +
          '*Abre apenas um ticket de cada vez.*'
        )
        .setColor('#2b2d31')
        .setThumbnail(CONFIG.LOGO_URL)
        .setFooter({ text: 'Manchester RP · Sistema de Tickets' });

      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('select_ticket_type')
        .setPlaceholder('Escolhe o tipo de ticket...')
        .addOptions([
          { label: 'Unbans', description: 'Abre ticket para unbans', value: 'unban', emoji: '⛔' },
          { label: 'Report de Jogador', description: 'Denunciar um jogador por quebra de regras', value: 'report_player', emoji: '🚔' },
          { label: 'VIPS', description: 'Abre ticket para adquirir o teu VIP', value: 'vip', emoji: '💎' },
          { label: 'Organizações', description: 'Abre ticket para falar de organizações', value: 'orgs', emoji: '📦' },
          { label: 'Outros', description: 'Abre ticket para assuntos gerais', value: 'other', emoji: '🌐' },
          { label: 'Report Bugs', description: 'Abre ticket para reportar bugs', value: 'bugs', emoji: '⚙️' },
          { label: 'Report Organização', description: 'Abre ticket para reportar organização', value: 'report_org', emoji: '🔫' },
          { label: 'Candidatura Streamers', description: 'Abre ticket para candidatura para streamer', value: 'streamer', emoji: '📷' },
        ]);

      await interaction.channel.send({ embeds: [embed], components: [new ActionRowBuilder().addComponents(selectMenu)] });
      return interaction.reply({ content: '✅ Painel enviado com sucesso!', ephemeral: true });
    }

    // COMANDO SUGESTOES SETUP
    if (interaction.commandName === 'sugestoes-setup') {
      if (!interaction.member.roles.cache.has(CONFIG.CEO_ROLE_ID) && !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({ content: '❌ Apenas membros com o cargo de **CEO** podem executar este comando.', ephemeral: true });
      }

      const infoEmbed = new EmbedBuilder()
        .setTitle('📋 Centro de Sugestões')
        .setDescription('Deixe sua sugestão usando o comando `/sugerir`')
        .setColor('#ffffff')
        .setFooter({ text: 'Manchester RP' });

      await interaction.channel.send({ embeds: [infoEmbed] });
      return interaction.reply({ content: '✅ Painel de sugestões configurado!', ephemeral: true });
    }

    // COMANDO SUGERIR
    if (interaction.commandName === 'sugerir') {
      const ideia = interaction.options.getString('ideia');
      const agora = new Date();
      const meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
      const dataFormatada = `${agora.getDate()} de ${meses[agora.getMonth()]} de ${agora.getFullYear()} ${String(agora.getHours()).padStart(2, '0')}:${String(agora.getMinutes()).padStart(2, '0')}`;

      const sugEmbed = new EmbedBuilder()
        .setAuthor({ name: `${interaction.user.username}#0`, iconURL: interaction.user.displayAvatarURL() })
        .setTitle(`💡 Nova Sugestão - ${sugestaoCounter++}`)
        .setDescription(`> ${ideia}\n\n──────────────────────────\n👤 **Enviado por:** <@${interaction.user.id}>\n🕒 **Data/Hora:** \`${dataFormatada}\``)
        .setColor('#ffffff')
        .setFooter({ text: 'Manchester RP' })
        .setTimestamp();

      await interaction.reply({ content: '✅ A tua sugestão foi enviada com sucesso!', ephemeral: true });
      const sugMsg = await interaction.channel.send({ embeds: [sugEmbed] });
      await sugMsg.react('👍');
      await sugMsg.react('👎');
      await sugMsg.startThread({ name: `Sugestão de ${interaction.user.username}`, autoArchiveDuration: 1440 });
    }

    // COMANDO GIVEAWAY
    if (interaction.commandName === 'giveaway') {
      const isStaff = interaction.member.roles.cache.has(CONFIG.STAFF_ROLE_ID) || interaction.member.permissions.has(PermissionFlagsBits.Administrator);
      if (!isStaff) {
        return interaction.reply({ content: '❌ Apenas membros da **Staff** podem criar sorteios.', ephemeral: true });
      }

      const premio = interaction.options.getString('premio');
      const duracaoEscolha = interaction.options.getString('duracao');
      const numGanhadores = interaction.options.getInteger('ganhadores') || 1;

      let tempoMs = 0;
      switch (duracaoEscolha) {
        case '10s': tempoMs = 10 * 1000; break;
        case '1h':  tempoMs = 1 * 60 * 60 * 1000; break;
        case '2h':  tempoMs = 2 * 60 * 60 * 1000; break;
        case '3h':  tempoMs = 3 * 60 * 60 * 1000; break;
        case '10h': tempoMs = 10 * 60 * 60 * 1000; break;
        case '24h': tempoMs = 24 * 60 * 60 * 1000; break;
        default:   tempoMs = 10 * 1000; break;
      }

      const terminaEm = Math.floor((Date.now() + tempoMs) / 1000);

      const giveawayEmbed = new EmbedBuilder()
        .setTitle(`🎉 **GIVEAWAY — ${premio}** 🎉`)
        .setDescription(
          `Clica no botão **🎉 Participar** abaixo para entrares no sorteio!\n\n` +
          `🎁 **Prémio:** \`${premio}\`\n` +
          `👑 **Criado por:** <@${interaction.user.id}>\n` +
          `🏆 **Vencedores:** \`${numGanhadores}\`\n` +
          `⏳ **Termina:** <t:${terminaEm}:R> (<t:${terminaEm}:f>)\n\n` +
          `👥 **Participantes:** \`0\``
        )
        .setColor('#5865F2')
        .setFooter({ text: 'Manchester RP · Giveaways' })
        .setTimestamp(Date.now() + tempoMs);

      const joinButton = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('join_giveaway')
          .setLabel('Participar')
          .setStyle(ButtonStyle.Success)
          .setEmoji('🎉')
      );

      await interaction.reply({ content: '✅ Sorteio criado com sucesso!', ephemeral: true });
      const giveawayMessage = await interaction.channel.send({ embeds: [giveawayEmbed], components: [joinButton] });

      // Guardar na memória
      activeGiveaways.set(giveawayMessage.id, {
        premio,
        numGanhadores,
        hostId: interaction.user.id,
        participants: new Set(),
        messageId: giveawayMessage.id,
        channelId: interaction.channel.id
      });

      // Temporizador para o final do Giveaway
      setTimeout(async () => {
        const giveawayData = activeGiveaways.get(giveawayMessage.id);
        if (!giveawayData) return;

        const channel = await client.channels.fetch(giveawayData.channelId).catch(() => null);
        if (!channel) return;

        const msg = await channel.messages.fetch(giveawayData.messageId).catch(() => null);
        if (!msg) return;

        const ArrayParticipantes = Array.from(giveawayData.participants);

        const disabledButton = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('join_giveaway_ended')
            .setLabel('Sorteio Encerrado')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true)
            .setEmoji('🔒')
        );

        if (ArrayParticipantes.length === 0) {
          const endedEmbed = EmbedBuilder.from(msg.embeds[0])
            .setTitle(`🎉 **GIVEAWAY ENCERRADO — ${premio}** 🎉`)
            .setDescription(`❌ **Sorteio cancelado:** Não houve participantes suficientes.`)
            .setColor('#ED4245');

          await msg.edit({ embeds: [endedEmbed], components: [disabledButton] });
          await channel.send({ content: `❌ O giveaway de **${premio}** foi encerrado sem vencedores por falta de participantes.` });
        } else {
          // Sortear vencedores aleatórios
          const vencedores = [];
          const numVencedoresReais = Math.min(giveawayData.numGanhadores, ArrayParticipantes.length);

          for (let i = 0; i < numVencedoresReais; i++) {
            const randomIndex = Math.floor(Math.random() * ArrayParticipantes.length);
            vencedores.push(ArrayParticipantes.splice(randomIndex, 1)[0]);
          }

          const listaVencedores = vencedores.map(id => `<@${id}>`).join(', ');

          const endedEmbed = EmbedBuilder.from(msg.embeds[0])
            .setTitle(`🎉 **GIVEAWAY ENCERRADO — ${premio}** 🎉`)
            .setDescription(
              `🎁 **Prémio:** \`${premio}\`\n` +
              `👑 **Criado por:** <@${giveawayData.hostId}>\n` +
              `🏆 **Grande Vencedor(es):** ${listaVencedores}\n` +
              `👥 **Total de Participantes:** \`${giveawayData.participants.size}\``
            )
            .setColor('#57F287');

          await msg.edit({ embeds: [endedEmbed], components: [disabledButton] });
          
          // Mensagem no canal
          await channel.send({ 
            content: `🎉 **PARABÉNS** ${listaVencedores}! Foste o grande vencedor do sorteio do prémio **${premio}**!\n\n` +
                     `📩 **Tens 48 horas para abrir um ticket na categoria "Outros / Assuntos Gerais" para reivindicares o teu prémio!** 🥳` 
          });

          // Envia também MP (mensagem privada) para os vencedores
          for (const winnerId of vencedores) {
            const user = await client.users.fetch(winnerId).catch(() => null);
            if (user) {
              await user.send({
                content: `🎉 **Parabéns!** Foste o grande vencedor do sorteio do prémio **${premio}** no server **Manchester RP**!\n\n` +
                         `⚠️ **Tens 48 horas para abrir um ticket na aba de assuntos/outros para reclamares o teu prémio.**`
              }).catch(() => {});
            }
          }
        }

        activeGiveaways.delete(giveawayMessage.id);
      }, tempoMs);
    }
  }

  // B) SELECT MENU DOS TICKETS
  if (interaction.isStringSelectMenu() && interaction.customId === 'select_ticket_type') {
    const type = interaction.values[0];
    const channelName = `ticket-${interaction.user.username.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
    if (interaction.guild.channels.cache.find(c => c.name === channelName)) {
      return interaction.reply({ content: `❌ Já tens um ticket aberto!`, ephemeral: true });
    }

    if (type === 'unban') {
      const modal = new ModalBuilder().setCustomId('modal_unban').setTitle('Unbans');
      modal.addComponents(
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('m_motivo').setLabel('Porque foste banido?').setStyle(TextInputStyle.Paragraph).setRequired(true)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('m_rever').setLabel('Porque devemos rever?').setStyle(TextInputStyle.Paragraph).setRequired(true))
      );
      return await interaction.showModal(modal);
    }
    if (type === 'report_player') {
      const modal = new ModalBuilder().setCustomId('modal_report_player').setTitle('Report de Jogador');
      modal.addComponents(
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('m_discord').setLabel('Discord do jogador reportado').setStyle(TextInputStyle.Short).setRequired(true)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('m_aconteceu').setLabel('O que aconteceu?').setStyle(TextInputStyle.Paragraph).setRequired(true)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('m_provas').setLabel('Tens provas?').setStyle(TextInputStyle.Paragraph).setRequired(false))
      );
      return await interaction.showModal(modal);
    }
    if (type === 'vip') {
      const modal = new ModalBuilder().setCustomId('modal_vip').setTitle('VIPS');
      modal.addComponents(
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('m_assunto').setLabel('Assunto').setStyle(TextInputStyle.Short).setRequired(true)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('m_comprovativo').setLabel('Comprovativo / detalhe').setStyle(TextInputStyle.Paragraph).setRequired(false))
      );
      return await interaction.showModal(modal);
    }
    if (type === 'orgs') {
      const modal = new ModalBuilder().setCustomId('modal_orgs').setTitle('Organizações');
      modal.addComponents(
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('m_assunto').setLabel('Assunto').setStyle(TextInputStyle.Short).setRequired(true)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('m_detalhes').setLabel('Detalhes extra').setStyle(TextInputStyle.Paragraph).setRequired(false))
      );
      return await interaction.showModal(modal);
    }
    if (type === 'other') {
      const modal = new ModalBuilder().setCustomId('modal_other').setTitle('Outros');
      modal.addComponents(
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('m_assunto').setLabel('Qual é o assunto?').setStyle(TextInputStyle.Short).setRequired(true)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('m_detalhes').setLabel('Detalhes').setStyle(TextInputStyle.Paragraph).setRequired(false))
      );
      return await interaction.showModal(modal);
    }
    if (type === 'bugs') {
      const modal = new ModalBuilder().setCustomId('modal_bugs').setTitle('Report Bugs');
      modal.addComponents(
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('m_bug').setLabel('Qual é o bug?').setStyle(TextInputStyle.Paragraph).setRequired(true)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('m_como').setLabel('Como aconteceu?').setStyle(TextInputStyle.Paragraph).setRequired(true)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('m_provas').setLabel('Provas').setStyle(TextInputStyle.Paragraph).setRequired(false))
      );
      return await interaction.showModal(modal);
    }
    if (type === 'report_org') {
      const modal = new ModalBuilder().setCustomId('modal_report_org').setTitle('Report Organização');
      modal.addComponents(
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('m_org').setLabel('Qual é a organização?').setStyle(TextInputStyle.Short).setRequired(true)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('m_aconteceu').setLabel('O Que aconteceu?').setStyle(TextInputStyle.Paragraph).setRequired(true)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('m_provas').setLabel('Provas').setStyle(TextInputStyle.Paragraph).setRequired(false))
      );
      return await interaction.showModal(modal);
    }
    if (type === 'streamer') {
      const modal = new ModalBuilder().setCustomId('modal_streamer').setTitle('Candidatura Streamers');
      modal.addComponents(
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('m_link').setLabel('Link Stream').setStyle(TextInputStyle.Short).setRequired(true))
      );
      return await interaction.showModal(modal);
    }
  }

  // C) CRIAÇÃO DO CANAL DO TICKET
  if (interaction.isModalSubmit() && interaction.customId.startsWith('modal_')) {
    await interaction.deferReply({ ephemeral: true });

    let typeKey = ''; let categoryName = ''; let emoji = ''; const fields = [];

    if (interaction.customId === 'modal_unban') {
      typeKey = 'unban'; categoryName = 'Unbans'; emoji = '⛔';
      fields.push({ name: 'Porque foste banido?:', value: interaction.fields.getTextInputValue('m_motivo') });
      fields.push({ name: 'Porque devemos rever?:', value: interaction.fields.getTextInputValue('m_rever') });
    } else if (interaction.customId === 'modal_report_player') {
      typeKey = 'report_player'; categoryName = 'Report de Jogador'; emoji = '🚔';
      fields.push({ name: 'Discord do jogador reportado:', value: interaction.fields.getTextInputValue('m_discord') });
      fields.push({ name: 'O que aconteceu?:', value: interaction.fields.getTextInputValue('m_aconteceu') });
      fields.push({ name: 'Tens provas?:', value: interaction.fields.getTextInputValue('m_provas') || 'Nenhuma' });
    } else if (interaction.customId === 'modal_vip') {
      typeKey = 'vip'; categoryName = 'VIPS'; emoji = '💎';
      fields.push({ name: 'Assunto:', value: interaction.fields.getTextInputValue('m_assunto') });
      fields.push({ name: 'Comprovativo / detalhe:', value: interaction.fields.getTextInputValue('m_comprovativo') || 'Nenhum' });
    } else if (interaction.customId === 'modal_orgs') {
      typeKey = 'orgs'; categoryName = 'Organizações'; emoji = '📦';
      fields.push({ name: 'Assunto:', value: interaction.fields.getTextInputValue('m_assunto') });
      fields.push({ name: 'Detalhes extra:', value: interaction.fields.getTextInputValue('m_detalhes') || 'Nenhum' });
    } else if (interaction.customId === 'modal_other') {
      typeKey = 'other'; categoryName = 'Outros'; emoji = '🌐';
      fields.push({ name: 'Qual é o assunto?:', value: interaction.fields.getTextInputValue('m_assunto') });
      fields.push({ name: 'Detalhes:', value: interaction.fields.getTextInputValue('m_detalhes') || 'Nenhum' });
    } else if (interaction.customId === 'modal_bugs') {
      typeKey = 'bugs'; categoryName = 'Report Bugs'; emoji = '⚙️';
      fields.push({ name: 'Qual é o bug?:', value: interaction.fields.getTextInputValue('m_bug') });
      fields.push({ name: 'Como aconteceu?:', value: interaction.fields.getTextInputValue('m_como') });
      fields.push({ name: 'Provas:', value: interaction.fields.getTextInputValue('m_provas') || 'Nenhuma' });
    } else if (interaction.customId === 'modal_report_org') {
      typeKey = 'report_org'; categoryName = 'Report Organização'; emoji = '🔫';
      fields.push({ name: 'Qual é a organização?:', value: interaction.fields.getTextInputValue('m_org') });
      fields.push({ name: 'O Que aconteceu?:', value: interaction.fields.getTextInputValue('m_aconteceu') });
      fields.push({ name: 'Provas:', value: interaction.fields.getTextInputValue('m_provas') || 'Nenhuma' });
    } else if (interaction.customId === 'modal_streamer') {
      typeKey = 'streamer'; categoryName = 'Candidatura Streamers'; emoji = '📷';
      fields.push({ name: 'Link Stream:', value: interaction.fields.getTextInputValue('m_link') });
    }

    ticketCounter++;
    const ticketId = `#${ticketCounter}`;
    const categoryId = CONFIG.CATEGORIES[typeKey];
    const channelName = `ticket-${interaction.user.username.toLowerCase().replace(/[^a-z0-9]/g, '')}`;

    try {
      const ticketChannel = await interaction.guild.channels.create({
        name: channelName,
        type: ChannelType.GuildText,
        parent: categoryId || null,
        permissionOverwrites: [
          { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
          { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.ReadMessageHistory] },
          { id: CONFIG.STAFF_ROLE_ID, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.ReadMessageHistory] },
        ],
      });

      const dataAbertura = new Date().toISOString().replace('T', ' ').substring(0, 19);
      await ticketChannel.setTopic(`${interaction.user.id}|${ticketId}|${categoryName}|${dataAbertura}`);

      const ticketEmbed = new EmbedBuilder()
        .setAuthor({ name: interaction.user.username, iconURL: interaction.user.displayAvatarURL() })
        .setTitle(`${emoji} Ticket ${ticketId} — ${categoryName}`)
        .addFields(fields)
        .setColor('#2b2d31')
        .setFooter({ text: 'MANCHESTER RP · Suporte' });

      const mainRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('claim_ticket').setLabel('Claim').setStyle(ButtonStyle.Primary).setEmoji('📋'),
        new ButtonBuilder().setCustomId('open_staff_panel').setLabel('Painel Staff').setStyle(ButtonStyle.Secondary).setEmoji('🛠️'),
        new ButtonBuilder().setCustomId('close_ticket').setLabel('Fechar Ticket').setStyle(ButtonStyle.Danger).setEmoji('🔒')
      );

      const msg = await ticketChannel.send({ 
        content: `<@${interaction.user.id}> | <@&${CONFIG.STAFF_ROLE_ID}>`, 
        embeds: [ticketEmbed], 
        components: [mainRow] 
      });

      await msg.pin().catch(() => {});
      await interaction.editReply({ content: `✅ Ticket criado com sucesso! Vai para ${ticketChannel}` });

    } catch (error) {
      console.error('Erro ao criar ticket:', error);
      await interaction.editReply({ content: '❌ Ocorreu um erro ao criar o teu ticket.' });
    }
  }

  // D) AÇÕES DOS BOTÕES (GIVEAWAYS & TICKETS)
  if (interaction.isButton()) {

    // PARTICIPAR NO GIVEAWAY
    if (interaction.customId === 'join_giveaway') {
      const giveawayData = activeGiveaways.get(interaction.message.id);
      if (!giveawayData) {
        return interaction.reply({ content: '❌ Este giveaway já não se encontra ativo.', ephemeral: true });
      }

      if (giveawayData.participants.has(interaction.user.id)) {
        giveawayData.participants.delete(interaction.user.id);
        
        // Atualizar contador no embed
        const updatedDescription = interaction.message.embeds[0].description.replace(
          /👥 \*\*Participantes:\*\* `\d+`/,
          `👥 **Participantes:** \`${giveawayData.participants.size}\``
        );
        const updatedEmbed = EmbedBuilder.from(interaction.message.embeds[0]).setDescription(updatedDescription);
        await interaction.message.edit({ embeds: [updatedEmbed] });

        return interaction.reply({ content: '🏃 Saíste da participação do giveaway.', ephemeral: true });
      } else {
        giveawayData.participants.add(interaction.user.id);

        // Atualizar contador no embed
        const updatedDescription = interaction.message.embeds[0].description.replace(
          /👥 \*\*Participantes:\*\* `\d+`/,
          `👥 **Participantes:** \`${giveawayData.participants.size}\``
        );
        const updatedEmbed = EmbedBuilder.from(interaction.message.embeds[0]).setDescription(updatedDescription);
        await interaction.message.edit({ embeds: [updatedEmbed] });

        return interaction.reply({ content: '🎉 Entraste no giveaway com sucesso! Boa sorte!', ephemeral: true });
      }
    }

    const isStaff = interaction.member && (interaction.member.roles.cache.has(CONFIG.STAFF_ROLE_ID) || interaction.member.permissions.has(PermissionFlagsBits.Administrator));

    // 1. CLAIM TICKET
    if (interaction.customId === 'claim_ticket') {
      if (!isStaff) return interaction.reply({ content: '❌ Apenas membros da staff podem assumir tickets.', ephemeral: true });

      const mainRow = ActionRowBuilder.from(interaction.message.components[0]);
      mainRow.components[0] = ButtonBuilder.from(mainRow.components[0]).setDisabled(true).setLabel(`Assumido por ${interaction.user.username}`);

      await interaction.update({ components: [mainRow] });
      await interaction.followUp({ content: `📌 O ticket foi assumido por <@${interaction.user.id}>.` });
    }

    // 2. PAINEL DA STAFF
    if (interaction.customId === 'open_staff_panel') {
      if (!isStaff) return interaction.reply({ content: '❌ Apenas a equipa de Staff pode abrir o painel de gestão.', ephemeral: true });

      const staffEmbed = new EmbedBuilder()
        .setTitle('🛠️ Painel de Gestão da Staff')
        .setDescription('Escolha a ação pretendida para este ticket:')
        .setColor('#2b2d31');

      const staffRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('notify_member').setLabel('Mencionar Player').setStyle(ButtonStyle.Secondary).setEmoji('🔔'),
        new ButtonBuilder().setCustomId('rename_ticket').setLabel('Renomear Ticket').setStyle(ButtonStyle.Secondary).setEmoji('✏️'),
        new ButtonBuilder().setCustomId('add_member').setLabel('Adicionar Player').setStyle(ButtonStyle.Success).setEmoji('👤'),
        new ButtonBuilder().setCustomId('remove_member').setLabel('Remover Player').setStyle(ButtonStyle.Danger).setEmoji('🚫')
      );

      return await interaction.reply({
        embeds: [staffEmbed],
        components: [staffRow],
        ephemeral: true
      });
    }

    // 3. FECHAR TICKET
    if (interaction.customId === 'close_ticket') {
      await interaction.reply({ content: '🔒 A fechar ticket e a gerar transcript...' });

      const topicData = interaction.channel.topic ? interaction.channel.topic.split('|') : [];
      const ownerId = topicData[0] || interaction.user.id;
      const ticketId = topicData[1] || '#0000';
      const categoryName = topicData[2] || 'Suporte';
      const dataAbertura = topicData[3] || 'Desconhecida';
      const dataFecho = new Date().toISOString().replace('T', ' ').substring(0, 19);

      const owner = await client.users.fetch(ownerId).catch(() => null);
      const ownerTag = owner ? owner.username : 'Desconhecido';

      const fetchedMessages = await interaction.channel.messages.fetch({ limit: 100 });
      let transcriptText = `=====================================================================\n`;
      transcriptText += `TICKET ${ticketId} — ${categoryName}\n`;
      transcriptText += `Criado por : ${ownerTag}\n`;
      transcriptText += `Aberto em  : ${dataAbertura}\n`;
      transcriptText += `Fechado por: ${interaction.user.username}\n`;
      transcriptText += `Fechado em : ${dataFecho}\n`;
      transcriptText += `=====================================================================\n\n`;

      fetchedMessages.reverse().forEach(msg => {
        transcriptText += `[${msg.createdAt.toLocaleString('pt-PT')}] ${msg.author.tag}: ${msg.content}\n`;
      });

      const buffer = Buffer.from(transcriptText, 'utf-8');
      const attachment = new AttachmentBuilder(buffer, { name: `${interaction.channel.name}.txt` });

      const transcriptChannel = interaction.guild.channels.cache.get(CONFIG.TRANSCRIPT_CHANNEL_ID);
      if (transcriptChannel) {
        await transcriptChannel.send({
          content: `=====================================================================\n` +
                   `**TICKET ${ticketId} — ${categoryName}**\n` +
                   `**Criado por :** ${ownerTag}\n` +
                   `**Aberto em  :** ${dataAbertura}\n` +
                   `**Fechado por:** ${interaction.user.username}\n` +
                   `**Fechado em :** ${dataFecho}`,
          files: [attachment]
        }).catch(() => {});
      }

      if (owner) {
        await owner.send({
          content: `=====================================================================\n` +
                   `**TICKET ${ticketId} — ${categoryName}**\n` +
                   `**Criado por :** ${ownerTag}\n` +
                   `**Aberto em  :** ${dataAbertura}\n` +
                   `**Fechado por:** ${interaction.user.username}\n` +
                   `**Fechado em :** ${dataFecho}\n\n` +
                   `O teu ticket foi encerrado com sucesso. Segue em anexo o teu transcript.`,
          files: [attachment]
        }).catch(() => {});
      }

      setTimeout(async () => {
        await interaction.channel.delete().catch(() => {});
      }, 2000);
    }

    // 4. MENCIONAR PLAYER
    if (interaction.customId === 'notify_member') {
      if (!isStaff) return interaction.reply({ content: '❌ Apenas a staff pode usar este botão.', ephemeral: true });
      const topicData = interaction.channel.topic ? interaction.channel.topic.split('|') : [];
      const ownerId = topicData[0];
      if (!ownerId) return interaction.reply({ content: '❌ Não foi possível encontrar o dono do ticket.', ephemeral: true });

      await interaction.channel.send({ content: `🔔 <@${ownerId}>, a equipa de suporte solicita a tua atenção no ticket!` });
      await interaction.reply({ content: '✅ Player notificado!', ephemeral: true });
    }

    // 5. ADICIONAR PLAYER
    if (interaction.customId === 'add_member') {
      if (!isStaff) return interaction.reply({ content: '❌ Apenas a staff pode usar este botão.', ephemeral: true });
      const modal = new ModalBuilder().setCustomId('modal_add_player').setTitle('Adicionar Player ao Ticket');
      modal.addComponents(new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('user_id').setLabel('ID do Utilizador').setPlaceholder('Ex: 854141780793884702').setStyle(TextInputStyle.Short).setRequired(true)
      ));
      return await interaction.showModal(modal);
    }

    // 6. REMOVER PLAYER
    if (interaction.customId === 'remove_member') {
      if (!isStaff) return interaction.reply({ content: '❌ Apenas a staff pode usar este botão.', ephemeral: true });
      const modal = new ModalBuilder().setCustomId('modal_remove_player').setTitle('Remover Player do Ticket');
      modal.addComponents(new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('user_id').setLabel('ID do Utilizador').setPlaceholder('Ex: 854141780793884702').setStyle(TextInputStyle.Short).setRequired(true)
      ));
      return await interaction.showModal(modal);
    }

    // 7. RENOMEAR TICKET
    if (interaction.customId === 'rename_ticket') {
      if (!isStaff) return interaction.reply({ content: '❌ Apenas a staff pode usar este botão.', ephemeral: true });
      const modal = new ModalBuilder().setCustomId('modal_rename_ticket').setTitle('Renomear Canal de Ticket');
      modal.addComponents(new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('new_name').setLabel('Novo Nome do Ticket').setPlaceholder('Ex: ticket-resolvido').setStyle(TextInputStyle.Short).setRequired(true)
      ));
      return await interaction.showModal(modal);
    }
  }

  // E) SUBMISSÃO DOS MODALS DA STAFF
  if (interaction.isModalSubmit()) {
    
    if (interaction.customId === 'modal_add_player') {
      const targetId = interaction.fields.getTextInputValue('user_id').trim();
      try {
        await interaction.channel.permissionOverwrites.edit(targetId, {
          ViewChannel: true,
          SendMessages: true,
          AttachFiles: true,
          ReadMessageHistory: true
        });
        await interaction.reply({ content: `✅ <@${targetId}> foi adicionado ao ticket com sucesso!` });
      } catch (err) {
        await interaction.reply({ content: '❌ Erro ao adicionar o utilizador.', ephemeral: true });
      }
    }

    if (interaction.customId === 'modal_remove_player') {
      const targetId = interaction.fields.getTextInputValue('user_id').trim();
      try {
        await interaction.channel.permissionOverwrites.delete(targetId);
        await interaction.reply({ content: `🚫 <@${targetId}> foi removido do ticket!` });
      } catch (err) {
        await interaction.reply({ content: '❌ Erro ao remover o utilizador.', ephemeral: true });
      }
    }

    if (interaction.customId === 'modal_rename_ticket') {
      const newName = interaction.fields.getTextInputValue('new_name').trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
      try {
        await interaction.channel.setName(newName);
        await interaction.reply({ content: `✏️ O ticket foi renomeado para **${newName}**!` });
      } catch (err) {
        await interaction.reply({ content: '❌ Erro ao renomear o canal.', ephemeral: true });
      }
    }
  }
});

client.login(process.env.DISCORD_TOKEN);