import mongoose from 'mongoose';

const SubmissionSchema = new mongoose.Schema({
  studentId: String,
  studentName: String,
  studentEmail: String,
  status: { type: String, enum: ['pending', 'approved', 'denied'], default: 'pending' },
  comments: [{
    admin: String,
    comment: String,
    timestamp: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

export default mongoose.models.Submission || mongoose.model('Submission', SubmissionSchema);
