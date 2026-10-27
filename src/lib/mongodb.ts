import { MongoClient, Db, Collection } from "mongodb";

let client: MongoClient | null = null;
let clientPromise: Promise<MongoClient> | null = null;

const uri = process.env.MONGODB_URI || "";

export interface NoraLearnedInsight {
  topic: string;
  insight: string;
  category: "editorial" | "tone" | "sources" | "corrections" | "general";
  createdAt: string;
  sourceContext?: string;
}

export interface NoraSessionMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
  metadata?: any;
}

let mongoCircuitOpenUntil = 0;
let mongoFailures = 0;
const MONGO_CIRCUIT_COOLDOWN_MS = 15000;

export async function getMongoDb(): Promise<Db | null> {
  if (!uri) {
    return null;
  }

  const now = Date.now();
  if (now < mongoCircuitOpenUntil) {
    return null; // Circuito abierto: respuesta instantánea (0ms) sin bloquear el hilo
  }

  try {
    if (!clientPromise) {
      client = new MongoClient(uri, {
        maxPoolSize: 20,
        minPoolSize: 1,
        serverSelectionTimeoutMS: 2500,
        connectTimeoutMS: 2500,
        socketTimeoutMS: 5000,
      });
      clientPromise = client.connect().catch((connectErr) => {
        clientPromise = null;
        client = null;
        throw connectErr;
      });
    }
    const connectedClient = await clientPromise;
    mongoFailures = 0;
    return connectedClient.db();
  } catch (error) {
    mongoFailures++;
    if (mongoFailures >= 2) {
      mongoCircuitOpenUntil = Date.now() + MONGO_CIRCUIT_COOLDOWN_MS;
      console.warn(`[MongoDB Circuit Breaker] Circuito ABIERTO por ${MONGO_CIRCUIT_COOLDOWN_MS / 1000}s ante indisponibilidad de Atlas.`);
    }
    clientPromise = null;
    client = null;
    return null;
  }
}

export async function getGlobalLearningCollection(): Promise<Collection | null> {
  const db = await getMongoDb();
  if (!db) return null;
  return db.collection("nora_learning_insights");
}

export async function getGlobalLearningSummary(agentId: string = "nora-prensa"): Promise<string> {
  try {
    const col = await getGlobalLearningCollection();
    if (!col) return "";
    const doc = await col.findOne({ agentId });
    return doc?.summaryPrompt || "";
  } catch (err) {
    console.warn("[MongoDB Atlas] Error recuperando resumen de aprendizaje:", err);
    return "";
  }
}

export async function recordLearnedInsight(
  insight: NoraLearnedInsight,
  agentId: string = "nora-prensa"
): Promise<boolean> {
  try {
    const col = await getGlobalLearningCollection();
    if (!col) return false;

    await col.updateOne(
      { agentId },
      {
        $push: { insights: insight } as any,
        $inc: { totalInteractions: 1 },
        $set: { updatedAt: new Date().toISOString() },
      },
      { upsert: true }
    );
    return true;
  } catch (err) {
    console.warn("[MongoDB Atlas] Error guardando insight:", err);
    return false;
  }
}

export async function updateLearningSummary(
  summaryPrompt: string,
  agentId: string = "nora-prensa"
): Promise<boolean> {
  try {
    const col = await getGlobalLearningCollection();
    if (!col) return false;

    await col.updateOne(
      { agentId },
      {
        $set: {
          summaryPrompt,
          updatedAt: new Date().toISOString(),
        },
      },
      { upsert: true }
    );
    return true;
  } catch (err) {
    console.warn("[MongoDB Atlas] Error actualizando resumen:", err);
    return false;
  }
}

export async function appendSessionMessages(
  sessionId: string,
  messages: NoraSessionMessage[],
  agentId: string = "nora-prensa"
): Promise<boolean> {
  try {
    const db = await getMongoDb();
    if (!db) return false;

    await db.collection("nora_memory_sessions").updateOne(
      { sessionId, agentId },
      {
        $push: { messages: { $each: messages } } as any,
        $set: { updatedAt: new Date().toISOString() },
      },
      { upsert: true }
    );
    return true;
  } catch (err) {
    console.warn("[MongoDB Atlas] Error registrando mensajes de sesion:", err);
    return false;
  }
}

export async function getSessionMessages(
  sessionId: string,
  limit: number = 20,
  agentId: string = "nora-prensa"
): Promise<NoraSessionMessage[]> {
  try {
    const db = await getMongoDb();
    if (!db) return [];

    const doc = await db.collection("nora_memory_sessions").findOne({ sessionId, agentId });
    if (!doc || !doc.messages) return [];
    return (doc.messages as NoraSessionMessage[]).slice(-limit);
  } catch (err) {
    console.warn("[MongoDB Atlas] Error recuperando sesion:", err);
    return [];
  }
}
