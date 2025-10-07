import { fetchAllRooms, fetchRoom } from "../../../db/dbFunctions.js";

export async function getStudentByRoom(req, res) {
    try{
        const room = req.query.room;
        if (!room)
            return res.status(400).json({ error: "Room query parameter is required" });
        const student = await fetchRoom(room);
        if (!student)
            return res.status(404).json({ error: "Room not found" });
        res.status(200).json(student);
    }catch(error){
        console.error("Error fetching room submissions:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

export async function getAllFilledRooms(req, res) {
    try{
        const rooms = await fetchAllRooms();
        res.status(200).json(rooms);
    }catch(error){
        console.error("Error fetching all rooms:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}