import mongoose from 'mongoose';

const SubmissionSchema = new mongoose.Schema({
  studentId: String,
  studentName: String,
  studentEmail: String,
  status: { type: String, enum: ['pending', 'approved', 'denied'], default: 'pending' },
}, { timestamps: true });

export default mongoose.models.Submission || mongoose.model('Submission', SubmissionSchema);