const Submission = require("../models/Submission");
const Form = require("../models/Form");
const { validateSubmission } = require("../services/validationService");
const { generateCSV } = require("../services/csvService");

const submitForm = async (req, res) => {
  try {
    // Handle both JSON and multipart/form-data
    let formId, answers;

    if (req.headers["content-type"]?.includes("multipart/form-data")) {
      // Multipart/form-data (with file uploads)
      formId = req.body.formId;
      answers =
        typeof req.body.answers === "string"
          ? JSON.parse(req.body.answers)
          : req.body.answers || [];

      // Process uploaded files
      if (req.files && req.files.length > 0) {
        // Map files to their field names
        const fileMap = {};
        req.files.forEach((file) => {
          // File fieldname matches the field name
          fileMap[file.fieldname] = file.filename; // Store the filename
        });

        // Update answers with file paths or add new entries for uploaded files
        if (Array.isArray(answers)) {
          // Update existing answers with file paths
          answers = answers.map((answer) => {
            // Try exact match first, then case-insensitive
            if (fileMap[answer.name]) {
              return { ...answer, value: fileMap[answer.name] };
            }
            // Try case-insensitive match
            const matchingKey = Object.keys(fileMap).find(
              (key) => key.toLowerCase() === answer.name.toLowerCase()
            );
            if (matchingKey) {
              return { ...answer, value: fileMap[matchingKey] };
            }
            return answer;
          });

          // Add file fields that weren't in answers array (files uploaded but not in answers)
          Object.keys(fileMap).forEach((fieldName) => {
            const exists = answers.some(
              (a) =>
                a.name === fieldName ||
                a.name.toLowerCase() === fieldName.toLowerCase()
            );
            if (!exists) {
              answers.push({ name: fieldName, value: fileMap[fieldName] });
            }
          });
        }
      }
    } else {
      // Regular JSON submission
      formId = req.body.formId;
      answers = req.body.answers || [];
    }

    const ip = req.ip || req.connection.remoteAddress || "";

    const form = await Form.findOne({
      _id: formId,
      isDeleted: false,
    });
    if (!form) {
      return res.status(404).json({ error: "Form not found" });
    }

    if (!form.isActive) {
      return res.status(400).json({ error: "Form is not active" });
    }

    // Ensure all file fields from form definition are in answers array for validation
    const fileFields = form.fields.filter((f) => f.type === "file");
    const answerNames = new Set(answers.map((a) => a.name));

    // Process file fields - ensure they're all in answers array with correct values
    fileFields.forEach((fileField) => {
      // Check if file was uploaded via FormData - try exact match, then case-insensitive
      let uploadedFile = req.files?.find(
        (f) => f.fieldname === fileField.name
      );
      if (!uploadedFile && req.files) {
        uploadedFile = req.files.find(
          (f) => f.fieldname.toLowerCase() === fileField.name.toLowerCase()
        );
      }

      if (answerNames.has(fileField.name)) {
        // Field already in answers - update value if file was uploaded
        const answerIndex = answers.findIndex(
          (a) => a.name === fileField.name
        );
        if (answerIndex !== -1) {
          if (uploadedFile) {
            // File was uploaded - update with actual uploaded filename
            answers[answerIndex].value = uploadedFile.filename;
          } else if (fileField.required && (!answers[answerIndex].value || answers[answerIndex].value.trim() === "")) {
            // Required field but no file - ensure empty for validation to catch
            answers[answerIndex].value = "";
          }
        }
      } else {
        // Field not in answers - add it
        if (uploadedFile) {
          // File was uploaded - add with filename
          answers.push({ name: fileField.name, value: uploadedFile.filename });
        } else {
          // No file uploaded - add empty for validation
          answers.push({ name: fileField.name, value: "" });
        }
        answerNames.add(fileField.name);
      }
    });

    // Ensure answers is always an array
    if (!Array.isArray(answers)) {
      answers = [];
    }

    // Validate submission (after processing files and ensuring all fields are in answers)
    // Debug: Log file processing results in development
    if (process.env.NODE_ENV === "development") {
      console.log(
        "Files received:",
        req.files?.map((f) => ({
          fieldname: f.fieldname,
          filename: f.filename,
        }))
      );
      console.log("Answers before validation:", answers);
      console.log(
        "File fields in form:",
        form.fields
          .filter((f) => f.type === "file")
          .map((f) => ({ name: f.name, label: f.label, required: f.required }))
      );
    }

    const validationErrors = validateSubmission(form, answers);
    if (validationErrors.length > 0) {
      return res.status(400).json({ errors: validationErrors });
    }

    // Save form snapshot for versioning
    const formSnapshot = {
      title: form.title,
      description: form.description,
      fields: form.fields.map((f) => ({
        label: f.label,
        name: f.name,
        type: f.type,
        required: f.required,
        options: f.options,
        conditionalFields: f.conditionalFields || {},
        validation: f.validation,
        order: f.order,
      })),
    };

    const submission = new Submission({
      formId,
      formVersion: form.version || 1,
      formSnapshot,
      answers,
      ip,
    });

    await submission.save();
    res.status(201).json({
      message: "Form submitted successfully",
      submissionId: submission._id,
    });
  } catch (error) {
    console.error("Error submitting form:", error);
    const errorMessage =
      process.env.NODE_ENV === "development"
        ? `Error submitting form: ${error.message}`
        : "Error submitting form";
    res.status(500).json({
      error: errorMessage,
      details: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
};

const getSubmissions = async (req, res) => {
  try {
    const {
      formId,
      page = 1,
      limit = 10,
      search = "",
      dateFrom,
      dateTo,
      sortBy = "submittedAt",
      sortOrder = "desc",
    } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = {};

    if (formId) {
      query.formId = formId;
    }

    // Date range filtering
    if (dateFrom || dateTo) {
      query.submittedAt = {};
      if (dateFrom) {
        query.submittedAt.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999); // Include entire day
        query.submittedAt.$lte = toDate;
      }
    }

    // Search in answers
    if (search && search.trim()) {
      query.$or = [{ "answers.value": { $regex: search, $options: "i" } }];
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === "asc" ? 1 : -1;

    const submissions = await Submission.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit))
      .populate("formId", "title");

    const total = await Submission.countDocuments(query);

    res.json({
      submissions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Error fetching submissions:", error);
    res.status(500).json({ error: "Error fetching submissions" });
  }
};

const getSubmissionById = async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.id).populate(
      "formId"
    );
    if (!submission) {
      return res.status(404).json({ error: "Submission not found" });
    }
    res.json(submission);
  } catch (error) {
    res.status(500).json({ error: "Error fetching submission" });
  }
};

const exportSubmissionsCSV = async (req, res) => {
  try {
    const { formId } = req.query;

    if (!formId) {
      return res.status(400).json({ error: "formId is required" });
    }

    const form = await Form.findOne({
      _id: formId,
      isDeleted: false,
    });
    if (!form) {
      return res.status(404).json({ error: "Form not found" });
    }

    const submissions = await Submission.find({ formId }).sort({
      submittedAt: -1,
    });
    const csv = generateCSV(submissions, form);

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="submissions-${formId}-${Date.now()}.csv"`
    );
    res.send(csv);
  } catch (error) {
    res.status(500).json({ error: "Error exporting submissions" });
  }
};

module.exports = {
  submitForm,
  getSubmissions,
  getSubmissionById,
  exportSubmissionsCSV,
};
