const mongoose = require('mongoose');

function toTitleCase(value) {
  if (!value) return value;
  return value
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

const studentSchema = new mongoose.Schema({
  enrollmentNumber: { type: String, required: false, uppercase: true, trim: true }, // Did unique_key, required = false
  fileNumber: { type: String, uppercase: true, trim: true },
  rollNumber: { type: String, uppercase: true, trim: true },

  firstName: { type: String, required: true, trim: true, set: toTitleCase },
  lastName: { type: String, required: false, trim: true, set: toTitleCase },
  dob: { type: Date },
  gender: { type: String, default: 'Male', enum: ['Male', 'Female', 'Other'], required: true },

  fatherName: { type: String, required: false, trim: true, set: toTitleCase },
  motherName: { type: String, required: false, trim: true, set: toTitleCase },

  personalEmailId: { type: String, lowercase: true, trim: true },
  collegeEmailId: { type: String, lowercase: true, trim: true },
  mobileNumber: { type: String },
  emergencyMobNumber: { type: String },

  // Below three attributes are used in modal for uploading students through CSV files.
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: false, default: null },
  section: { type: String, default: 'A', enum: ['A', 'B', 'C', 'D'] },

  admissionYear: { type: Number, required: false },
  currentSession: { type: String, trim: true },

  year: { type: String, enum: ['1', '2', '3', '4'], required: false },
  semester: { type: String, default: '1', enum: ['1', '2', '3', '4', '5', '6', '7', '8'], required: true },
  group: { type: String, default: 'All', enum: ['A', 'B', 'C', 'D', 'E', 'All'] },
  image: { type: String, default: '', required: false },


  localAddressLine1: { type: String, trim: true, set: toTitleCase },
  localAddressLine2: { type: String, trim: true, set: toTitleCase },
  localCity: { type: String, trim: true, set: toTitleCase },
  localState: { type: String, trim: true, set: toTitleCase },
  localPincode: { type: String, trim: true },

  permanentAddressLine1: { type: String, trim: true, set: toTitleCase },
  permanentAddressLine2: { type: String, trim: true, set: toTitleCase },
  permanentcity: { type: String, trim: true, set: toTitleCase },
  permanentState: { type: String, trim: true, set: toTitleCase },
  permanentPincode: { type: String, trim: true },

  status: { type: String, enum: ['Active', 'InActive'], default: 'Active' },
}, { timestamps: true });


module.exports = mongoose.model('student', studentSchema);