import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const HOSTNAME = typeof window !== "undefined" && window.location && window.location.hostname
    ? window.location.hostname
    : "10.40.1.114";
const BASE_URL = `http://${HOSTNAME}:8000/api/`;

export const API = axios.create({
    baseURL: BASE_URL,
});

API.interceptors.request.use(
    async (config) => {
        const token = await AsyncStorage.getItem("token");
        if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// ==========================================
// MOCK DATABASE & LOGIC FOR OFFLINE FALLBACK
// ==========================================

const INITIAL_DANGERS: any[] = [];

const INITIAL_USERS = [
    { id: 1, username: "admin", email: "admin@disaster.org", is_active: true }
];

// Helper to get from AsyncStorage
const getStoredAsync = async (key: string, fallback: any) => {
    const data = await AsyncStorage.getItem(key);
    if (!data) {
        await AsyncStorage.setItem(key, JSON.stringify(fallback));
        return fallback;
    }
    try {
        return JSON.parse(data);
    } catch {
        return fallback;
    }
};

const saveStoredAsync = async (key: string, data: any) => {
    await AsyncStorage.setItem(key, JSON.stringify(data));
};

// Simulated AI verification logic
const performAIVerification = (type: string, severity: string, source: string, comment = "", existingScore: any = null, existingStatus: any = null) => {
    let calculatedSeverity = severity || "Low";
    if (calculatedSeverity === "High") calculatedSeverity = "Critical";

    let score = existingScore !== null && existingScore !== undefined ? Number(existingScore) : 90;
    let status = existingStatus || "Verified";
    let aiComment = comment || "AI automatic validation completed.";

    if (existingScore === null || existingScore === undefined) {
        if (source === "IoT") {
        status = "Verified";
        if (type === "Pothole") {
            let gForce = 3.9;
            const match = aiComment.match(/(\d+(\.\d+)?)\s*G/i);
            if (match) {
                gForce = parseFloat(match[1]);
            }
            if (gForce >= 3.5) {
                calculatedSeverity = "Critical";
                score = Math.floor(92 + Math.min(7, (gForce - 3.5) * 5));
            } else if (gForce >= 1.8) {
                calculatedSeverity = "Medium";
                score = Math.floor(80 + (gForce - 1.8) * 7);
            } else {
                calculatedSeverity = "Low";
                score = Math.floor(70 + gForce * 5);
            }
            aiComment = `Centralized AI validation complete: vibration impact shock of ${gForce}G matches standard pothole profile.`;
        } else if (type === "Flood") {
            let waterLevel = 2.8;
            const match = aiComment.match(/(\d+(\.\d+)?)\s*m/i);
            if (match) {
                waterLevel = parseFloat(match[1]);
            }
            if (waterLevel >= 2.2) {
                calculatedSeverity = "Critical";
                score = Math.floor(93 + Math.min(6, (waterLevel - 2.2) * 8));
            } else if (waterLevel >= 0.8) {
                calculatedSeverity = "Medium";
                score = Math.floor(81 + (waterLevel - 0.8) * 8);
            } else {
                calculatedSeverity = "Low";
                score = Math.floor(70 + waterLevel * 10);
            }
            aiComment = `Centralized AI telemetry validation complete: moisture accumulation of ${waterLevel}m matches severe accumulation model.`;
        } else {
            calculatedSeverity = "Critical";
            score = 95;
            aiComment = "Sensor trigger verified by autonomous system checklist.";
        }
    } else {
        // User reports
        const rand = Math.random();
        if (rand > 0.85) {
            status = "Fake";
            score = Math.floor(Math.random() * 25) + 40; // 40% to 65%
            aiComment = "Report geolocation does not align with visual telemetry indicators.";
            calculatedSeverity = "Low";
        } else {
            status = "Verified";
            if (type === "Pothole") {
                let depth = 8.5;
                if (calculatedSeverity === "Critical") depth = parseFloat((12 + Math.random() * 8).toFixed(1));
                else if (calculatedSeverity === "Medium") depth = parseFloat((5 + Math.random() * 7).toFixed(1));
                else depth = parseFloat((1 + Math.random() * 4).toFixed(1));

                if (depth >= 12) {
                    calculatedSeverity = "Critical";
                    score = Math.floor(90 + (depth - 12) * 1.1);
                } else if (depth >= 5) {
                    calculatedSeverity = "Medium";
                    score = Math.floor(80 + (depth - 5) * 1.5);
                } else {
                    calculatedSeverity = "Low";
                    score = Math.floor(70 + depth * 2.0);
                }
                aiComment = `CV classification: asphalt crater depth calculated at ${depth}cm.`;
            } else if (type === "Flood") {
                let level = 1.2;
                if (calculatedSeverity === "Critical") level = parseFloat((2.0 + Math.random() * 1.5).toFixed(2));
                else if (calculatedSeverity === "Medium") level = parseFloat((0.8 + Math.random() * 1.2).toFixed(2));
                else level = parseFloat((0.1 + Math.random() * 0.7).toFixed(2));

                if (level >= 2.0) {
                    calculatedSeverity = "Critical";
                    score = Math.floor(92 + (level - 2.0) * 5);
                } else if (level >= 0.8) {
                    calculatedSeverity = "Medium";
                    score = Math.floor(82 + (level - 0.8) * 8);
                } else {
                    calculatedSeverity = "Low";
                    score = Math.floor(72 + level * 10);
                }
                aiComment = `CV classification: street flooding water depth estimated at ${level}m.`;
            } else {
                let vehicles = 2;
                if (calculatedSeverity === "Critical") vehicles = Math.floor(Math.random() * 2) + 3;
                else if (calculatedSeverity === "Medium") vehicles = 2;
                else vehicles = 1;

                if (vehicles >= 3) {
                    calculatedSeverity = "Critical";
                    score = Math.floor(91 + Math.random() * 8);
                } else if (vehicles === 2) {
                    calculatedSeverity = "Medium";
                    score = Math.floor(83 + Math.random() * 7);
                } else {
                    calculatedSeverity = "Low";
                    score = Math.floor(73 + Math.random() * 7);
                }
                aiComment = `CV classification: collision crash profile involves ${vehicles} vehicle(s).`;
            }
        }
    }
    }

    if (score < 75) {
        status = "Fake";
    }
    return { ai_status: status, ai_score: score, ai_comment: aiComment, severity: calculatedSeverity };
};

// Helper to queue offline danger reports
const queueOfflineDanger = async (config: any) => {
    try {
        let parsedData: any = {};
        if (config.data instanceof FormData) {
            const fd = config.data as any;
            parsedData.type = fd.get ? fd.get("type") : (config.data as any)._parts?.find((p: any) => p[0] === "type")?.[1];
            parsedData.severity = fd.get ? fd.get("severity") : (config.data as any)._parts?.find((p: any) => p[0] === "severity")?.[1];
            parsedData.latitude = parseFloat(fd.get ? fd.get("latitude") : (config.data as any)._parts?.find((p: any) => p[0] === "latitude")?.[1]);
            parsedData.longitude = parseFloat(fd.get ? fd.get("longitude") : (config.data as any)._parts?.find((p: any) => p[0] === "longitude")?.[1]);
            parsedData.source = fd.get ? fd.get("source") : (config.data as any)._parts?.find((p: any) => p[0] === "source")?.[1] || "User";
            parsedData.ai_status = fd.get ? fd.get("ai_status") : (config.data as any)._parts?.find((p: any) => p[0] === "ai_status")?.[1];
            parsedData.ai_score = fd.get ? fd.get("ai_score") : (config.data as any)._parts?.find((p: any) => p[0] === "ai_score")?.[1];
            parsedData.ai_comment = fd.get ? fd.get("ai_comment") : (config.data as any)._parts?.find((p: any) => p[0] === "ai_comment")?.[1];
        } else {
            parsedData = typeof config.data === "string" ? JSON.parse(config.data) : config.data;
        }

        const queueStr = await AsyncStorage.getItem("offline_danger_queue");
        const queue = queueStr ? JSON.parse(queueStr) : [];
        
        queue.push({
            id: Date.now(),
            ...parsedData,
            created_at: new Date().toISOString()
        });

        await AsyncStorage.setItem("offline_danger_queue", JSON.stringify(queue));
        console.log("Danger report queued offline. Queue size:", queue.length);
    } catch (e) {
        console.error("Failed to queue offline danger:", e);
    }
};

// Sync offline queue helper (bypasses mocking to hit network directly)
export const syncOfflineQueue = async (): Promise<number> => {
    try {
        const queueStr = await AsyncStorage.getItem("offline_danger_queue");
        if (!queueStr) return 0;
        const queue = JSON.parse(queueStr);
        if (queue.length === 0) return 0;

        console.log(`Syncing ${queue.length} offline danger reports to server...`);
        let syncedCount = 0;

        for (const item of queue) {
            const config = {
                url: "dangers/",
                method: "post",
                data: {
                    type: item.type,
                    severity: item.severity,
                    latitude: item.latitude,
                    longitude: item.longitude,
                    source: item.source || "User",
                    ai_status: item.ai_status,
                    ai_score: item.ai_score,
                    ai_comment: item.ai_comment
                },
                skipOfflineQueue: true
            };

            await API.request(config as any);
            syncedCount++;
        }

        await AsyncStorage.removeItem("offline_danger_queue");
        console.log(`Successfully synced ${syncedCount} queued reports!`);
        return syncedCount;
    } catch (e: any) {
        console.log("Offline sync failed (server is still unreachable):", e.message);
        return 0;
    }
};

// Intercept network failures and fall back to Mock DB
API.interceptors.response.use(
    (response) => response,
    async (error) => {
        const config = error.config;
        if (!config) throw error;

        // If this is a synchronization check request, bypass local fallback mocking
        if ((config as any).skipOfflineQueue) {
            throw error;
        }

        const isNetworkError = !error.response || error.code === "ERR_NETWORK" || error.message?.includes("Network");
        if (isNetworkError) {
            console.warn("API Server offline. Falling back to AsyncStorage Mock DB for URL:", config.url);
            
            const url = config.url || "";
            const method = (config.method || "get").toLowerCase();
            let cleanUrl = url.replace(config.baseURL || "", "");
            if (cleanUrl.startsWith("/")) cleanUrl = cleanUrl.substring(1);

            if (cleanUrl.startsWith("dangers") && method === "post") {
                await queueOfflineDanger(config);
            }

            const mockResponse = await handleMockRequest(config);
            return mockResponse;
        }
        throw error;
    }
);

// Handler for mock requests
const handleMockRequest = async (config: any): Promise<any> => {
    const url = config.url || "";
    const method = (config.method || "get").toLowerCase();
    
    let cleanUrl = url.replace(config.baseURL || "", "");
    if (cleanUrl.startsWith("/")) cleanUrl = cleanUrl.substring(1);
    
    let responseData: any = null;
    let status = 200;

    // --- DANGERS ---
    if (cleanUrl.startsWith("dangers/")) {
        const dangers = await getStoredAsync("mock_dangers", INITIAL_DANGERS);
        
        // POST /dangers/
        if (method === "post") {
            let parsedData: any = {};
            if (config.data instanceof FormData) {
                const fd = config.data as any;
                // Parse FormData in mock environment
                parsedData.type = fd.get ? fd.get("type") : (config.data as any)._parts?.find((p: any) => p[0] === "type")?.[1];
                parsedData.severity = fd.get ? fd.get("severity") : (config.data as any)._parts?.find((p: any) => p[0] === "severity")?.[1];
                parsedData.latitude = parseFloat(fd.get ? fd.get("latitude") : (config.data as any)._parts?.find((p: any) => p[0] === "latitude")?.[1]);
                parsedData.longitude = parseFloat(fd.get ? fd.get("longitude") : (config.data as any)._parts?.find((p: any) => p[0] === "longitude")?.[1]);
                parsedData.source = fd.get ? fd.get("source") : (config.data as any)._parts?.find((p: any) => p[0] === "source")?.[1] || "User";
                parsedData.ai_status = fd.get ? fd.get("ai_status") : (config.data as any)._parts?.find((p: any) => p[0] === "ai_status")?.[1];
                parsedData.ai_score = fd.get ? fd.get("ai_score") : (config.data as any)._parts?.find((p: any) => p[0] === "ai_score")?.[1];
                parsedData.ai_comment = fd.get ? fd.get("ai_comment") : (config.data as any)._parts?.find((p: any) => p[0] === "ai_comment")?.[1];
            } else {
                try {
                    parsedData = typeof config.data === "string" ? JSON.parse(config.data) : config.data;
                } catch {
                    parsedData = config.data || {};
                }
            }

            const source = parsedData.source || "User";
            const aiData = performAIVerification(
                parsedData.type,
                parsedData.severity,
                source,
                parsedData.ai_comment || "",
                parsedData.ai_score,
                parsedData.ai_status
            );
            
            if (aiData.ai_score < 75) {
                return Promise.reject({
                    config: config,
                    response: {
                        data: { error: "Validation Failed: Telemetry metrics do not exceed the minimum hazard thresholds." },
                        status: 400,
                        statusText: "Bad Request",
                        headers: { "content-type": "application/json" }
                    }
                });
            }

            const user = (await AsyncStorage.getItem("username")) || "anonymous";

            const newDanger = {
                id: dangers.length > 0 ? Math.max(...dangers.map((d: any) => d.id)) + 1 : 1,
                type: parsedData.type || "Pothole",
                severity: aiData.severity,
                latitude: Number(parsedData.latitude) || 0.3476,
                longitude: Number(parsedData.longitude) || 32.5825,
                created_by: user,
                source: source,
                created_at: new Date().toISOString(),
                ai_status: aiData.ai_status,
                ai_score: aiData.ai_score,
                ai_comment: aiData.ai_comment
            };
            
            dangers.unshift(newDanger);
            await saveStoredAsync("mock_dangers", dangers);
            responseData = newDanger;
            status = 201;
        }
        // DELETE /dangers/{id}/
        else if (method === "delete") {
            const matches = cleanUrl.match(/dangers\/(\d+)/);
            if (matches) {
                const id = parseInt(matches[1]);
                const filtered = dangers.filter((d: any) => d.id !== id);
                await saveStoredAsync("mock_dangers", filtered);
                status = 204;
            }
        }
        // GET /dangers/
        else {
            responseData = dangers;
        }
    }
    
    // --- LOGIN ---
    else if (cleanUrl.startsWith("login/")) {
        let body: any = {};
        try {
            body = typeof config.data === "string" ? JSON.parse(config.data) : config.data;
        } catch {}
        
        const username = body.username || "admin";
        await AsyncStorage.setItem("username", username);
        await AsyncStorage.setItem("token", "mock-jwt-access-token");
        
        responseData = {
            access: "mock-jwt-access-token",
            refresh: "mock-jwt-refresh-token",
            username: username
        };
        status = 200;
    }

    // --- SIGNUP ---
    else if (cleanUrl.startsWith("signup/")) {
        let body: any = {};
        try {
            body = typeof config.data === "string" ? JSON.parse(config.data) : config.data;
        } catch {}

        const users = await getStoredAsync("mock_users", INITIAL_USERS);
        const newUser = {
            id: users.length > 0 ? Math.max(...users.map((u: any) => u.id)) + 1 : 1,
            username: body.username,
            email: body.email,
            is_active: true
        };
        users.push(newUser);
        await saveStoredAsync("mock_users", users);
        
        responseData = { success: true, user: newUser };
        status = 201;
    }

    // --- USERS ---
    else if (cleanUrl.startsWith("users/")) {
        const users = await getStoredAsync("mock_users", INITIAL_USERS);
        
        // PATCH /users/{id}/toggle/
        if (cleanUrl.includes("/toggle/")) {
            const matches = cleanUrl.match(/users\/(\d+)\/toggle/);
            if (matches) {
                const id = parseInt(matches[1]);
                const updated = users.map((u: any) => {
                    if (u.id === id) {
                        return { ...u, is_active: !u.is_active };
                    }
                    return u;
                });
                await saveStoredAsync("mock_users", updated);
                responseData = updated.find((u: any) => u.id === id);
            }
        }
        // DELETE /users/{id}/delete/
        else if (cleanUrl.includes("/delete/") || method === "delete") {
            const matches = cleanUrl.match(/users\/(\d+)/);
            if (matches) {
                const id = parseInt(matches[1]);
                const filtered = users.filter((u: any) => u.id !== id);
                await saveStoredAsync("mock_users", filtered);
                status = 204;
            }
        }
        // GET /users/
        else {
            responseData = users;
        }
    }

    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({
                data: responseData,
                status: status,
                statusText: status >= 200 && status < 300 ? "OK" : "Error",
                headers: { "content-type": "application/json" },
                config: config,
            });
        }, 150);
    });
};