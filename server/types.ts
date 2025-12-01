import z from "zod/v4"

export type NamedRoomStatus = RoomStatus & {
  building: string
  room: string
}

export type RoomStatus = Free | Busy | BusyUntilTmrw

export type Time = number
export type FutureTime = number | "tmrw"

export interface Free {
  status: "free"
  since: Time
  until: FutureTime
}

export interface Busy {
  status: "busy"
  freeAt: Time
  until: FutureTime
}

export interface BusyUntilTmrw {
  status: "busyUntilTmrw"
}
export interface Building {
  name: string
  rooms: NamedRoomStatus[]
}export interface Class {
  name: string
  subject: string
  classId: string
  start: number
  end: number
}
export const freeRoomsRequestSchema = z.object({
  origin: z.object({
    type: z.literal(["room", "building"]),
    name: z.string(),
  }),
  time: z.number(),
  dayOfTheWeek: z.literal([0, 1, 2, 3, 4, 5, 6]),
  minimumDuration: z.union([z.literal(false), z.number()]),
})
export type FreeRoomsRequest = z.infer<typeof freeRoomsRequestSchema>

