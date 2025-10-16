import mongoose from 'mongoose';

const GradeConfigSchema = new mongoose.Schema({
  grade: { type: String, required: true, unique: true },
  maleRooms: [{ type: Number, required: true }],
  femaleRooms: [{ type: Number, required: true }]
}, { timestamps: true });

export default mongoose.models.GradeConfig || mongoose.model('GradeConfig', GradeConfigSchema);
