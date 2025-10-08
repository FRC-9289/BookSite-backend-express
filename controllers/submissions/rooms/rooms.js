import { fetchAllRooms, fetchAllRoomSubmissions, fetchStudentByRoom } from "../../../db/dbFunctions.js";

export async function getStudentByRoom(req, res) {
    try{
        const room = req.query.room;
        if (!room)
            return res.status(400).json({ error: "Room query parameter is required" });
        const student = await fetchStudentByRoom(room);
        if (!student)
            return res.status(404).json({ error: "Room not found" });
        res.status(200).json(student);
    }catch(error){
        console.error("Error fetching room submissions:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

export async function getAllUnfilledRooms(req, res) {
    try {
        const rooms = await fetchAllRoomSubmissions();
        const unfilledRoomArrays = []; // store arrays keyed by bus+gender+roomNumber
    
        for (const bus in rooms) {
          const busObj = rooms[bus];
          for (const gender in busObj) {
            const genderObj = busObj[gender];
            for (const roomId in genderObj) {
              const roomArray = genderObj[roomId];
              if(roomArray.length < 2 && bus != "_id") unfilledRoomArrays.push(bus+""+((gender=="Male")?"M":"F")+""+roomId)
            }
          }
        }
    
        res.status(200).json(unfilledRoomArrays);
    } catch (error) {
      console.error("Error fetching all rooms:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
  
  