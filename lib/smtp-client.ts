import net from "node:net";
import tls from "node:tls";

export interface SmtpMessage {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  from: string;
  fromName?: string;
  to: string;
  subject: string;
  text: string;
}

export async function sendSmtpMail(message: SmtpMessage) {
  const client = new SmtpSession(message.host, message.port, message.secure);
  await client.connect();
  try {
    await client.expect([220]);
    await client.command(`EHLO ${smtpDomain()}`, [250]);

    if (!message.secure) {
      await client.command("STARTTLS", [220]);
      await client.upgradeToTls(message.host);
      await client.command(`EHLO ${smtpDomain()}`, [250]);
    }

    await client.command("AUTH LOGIN", [334]);
    await client.command(Buffer.from(message.user).toString("base64"), [334]);
    await client.command(Buffer.from(message.password).toString("base64"), [235]);
    await client.command(`MAIL FROM:<${message.from}>`, [250]);
    await client.command(`RCPT TO:<${message.to}>`, [250, 251]);
    await client.command("DATA", [354]);
    await client.writeData(formatMessage(message));
    await client.expect([250]);
    await client.command("QUIT", [221]);
  } finally {
    client.close();
  }
}

function smtpDomain() {
  return "consultorio-oftalmologico.local";
}

function formatMessage(message: SmtpMessage) {
  const from = message.fromName
    ? `${encodeHeader(message.fromName)} <${message.from}>`
    : message.from;

  const lines = [
    `From: ${from}`,
    `To: ${message.to}`,
    `Subject: ${encodeHeader(message.subject)}`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: 8bit",
    "",
    message.text,
  ];

  return `${lines.join("\r\n").replace(/^\./gm, "..")}\r\n.\r\n`;
}

function encodeHeader(value: string) {
  if (/^[\x00-\x7F]*$/.test(value)) return value;
  return `=?UTF-8?B?${Buffer.from(value, "utf8").toString("base64")}?=`;
}

class SmtpSession {
  private socket: net.Socket | tls.TLSSocket | null = null;
  private buffer = "";
  private pending:
    | {
        expected: number[];
        resolve: (value: string) => void;
        reject: (error: Error) => void;
      }
    | null = null;

  constructor(
    private host: string,
    private port: number,
    private secure: boolean
  ) {}

  connect() {
    return new Promise<void>((resolve, reject) => {
      const socket = this.secure
        ? tls.connect({ host: this.host, port: this.port, servername: this.host }, resolve)
        : net.connect({ host: this.host, port: this.port }, resolve);

      socket.setTimeout(20000);
      socket.on("data", (chunk) => this.handleData(chunk));
      socket.on("timeout", () => this.fail(new Error("Timeout SMTP")));
      socket.on("error", reject);
      this.socket = socket;
    });
  }

  upgradeToTls(host: string) {
    return new Promise<void>((resolve, reject) => {
      if (!this.socket) return reject(new Error("Socket SMTP no conectado"));
      this.socket.removeAllListeners("data");
      const secureSocket = tls.connect({ socket: this.socket, servername: host }, resolve);
      secureSocket.setTimeout(20000);
      secureSocket.on("data", (chunk) => this.handleData(chunk));
      secureSocket.on("timeout", () => this.fail(new Error("Timeout SMTP")));
      secureSocket.on("error", reject);
      this.socket = secureSocket;
    });
  }

  command(command: string, expected: number[]) {
    this.write(`${command}\r\n`);
    return this.expect(expected);
  }

  writeData(data: string) {
    this.write(data);
  }

  expect(expected: number[]) {
    return new Promise<string>((resolve, reject) => {
      this.pending = { expected, resolve, reject };
      this.flush();
    });
  }

  close() {
    this.socket?.destroy();
  }

  private write(data: string) {
    if (!this.socket) throw new Error("Socket SMTP no conectado");
    this.socket.write(data);
  }

  private handleData(chunk: Buffer) {
    this.buffer += chunk.toString("utf8");
    this.flush();
  }

  private flush() {
    if (!this.pending) return;
    const lines = this.buffer.split(/\r?\n/).filter(Boolean);
    if (lines.length === 0) return;

    const lastLine = lines[lines.length - 1];
    if (!/^\d{3} /.test(lastLine)) return;

    const code = Number(lastLine.slice(0, 3));
    const response = this.buffer;
    this.buffer = "";
    const pending = this.pending;
    this.pending = null;

    if (pending.expected.includes(code)) {
      pending.resolve(response);
    } else {
      pending.reject(new Error(`Respuesta SMTP inesperada ${code}: ${response.trim()}`));
    }
  }

  private fail(error: Error) {
    if (this.pending) {
      this.pending.reject(error);
      this.pending = null;
    }
    this.close();
  }
}
