import type { Server as SocketServer } from "socket.io";

let _io: SocketServer | null = null;

export function setIo(io: SocketServer): void {
  _io = io;
}

export function getIo(): SocketServer | null {
  return _io;
}

export interface ActiveCourier {
  id: string;
  lat: number;
  lng: number;
  name: string;
  updatedAt: number;
}

export const activeCouriers = new Map<string, ActiveCourier>();

export function setupSocketHandlers(io: SocketServer): void {
  io.on("connection", (socket) => {
    socket.on("customer:watch", () => {
      socket.join("customers");
      const all = Array.from(activeCouriers.values());
      socket.emit("couriers:all", all);
    });

    socket.on("courier:join", (data: { courierId: string; name: string }) => {
      socket.data.courierId = String(data.courierId);
    });

    socket.on("courier:location", (data: { courierId: string; lat: number; lng: number; name: string }) => {
      const entry: ActiveCourier = {
        id: String(data.courierId),
        lat: data.lat,
        lng: data.lng,
        name: data.name,
        updatedAt: Date.now(),
      };
      activeCouriers.set(entry.id, entry);
      io.emit("courier:moved", entry);
    });

    socket.on("disconnect", () => {
      const courierId = socket.data.courierId;
      if (!courierId) return;
      setTimeout(() => {
        const c = activeCouriers.get(courierId);
        if (c && Date.now() - c.updatedAt > 29000) {
          activeCouriers.delete(courierId);
          io.emit("courier:offline", { id: courierId });
        }
      }, 30000);
    });
  });

  setInterval(() => {
    const now = Date.now();
    for (const [id, c] of activeCouriers.entries()) {
      if (now - c.updatedAt > 30000) {
        activeCouriers.delete(id);
        io.emit("courier:offline", { id });
      }
    }
  }, 15000);
}
