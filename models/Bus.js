import mongoose from 'mongoose';

const busSchema = new mongoose.Schema({
  name: { type: String, required: true },
  students: [String],
});

export default mongoose.model('Bus', busSchema);