import { z } from 'zod';
export declare const PROTOCOL_VERSION = "1.0";
export declare const BaseEnvelopeSchema: z.ZodObject<{
    version: z.ZodDefault<z.ZodString>;
    id: z.ZodString;
    event: z.ZodString;
    type: z.ZodEnum<["REQUEST", "RESPONSE", "EVENT", "ERROR"]>;
    seq: z.ZodNumber;
    timestamp: z.ZodNumber;
    sessionId: z.ZodString;
    workspaceId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    version: string;
    id: string;
    event: string;
    type: "REQUEST" | "RESPONSE" | "EVENT" | "ERROR";
    seq: number;
    timestamp: number;
    sessionId: string;
    workspaceId: string;
}, {
    id: string;
    event: string;
    type: "REQUEST" | "RESPONSE" | "EVENT" | "ERROR";
    seq: number;
    timestamp: number;
    sessionId: string;
    workspaceId: string;
    version?: string | undefined;
}>;
export type BaseEnvelope = z.infer<typeof BaseEnvelopeSchema>;
//# sourceMappingURL=index.d.ts.map