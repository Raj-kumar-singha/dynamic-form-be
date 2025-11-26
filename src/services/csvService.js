const Form = require('../models/Form');

const generateCSV = (submissions, form) => {
  if (!submissions || submissions.length === 0) {
    return 'No submissions found';
  }

  // Get all field names from the form
  const fieldNames = form.fields.map(f => f.name);
  
  // Create header row
  const headers = ['Submission ID', 'Submitted At', 'IP Address', ...fieldNames.map(name => {
    const field = form.fields.find(f => f.name === name);
    return field ? field.label : name;
  })];
  
  // Create CSV rows
  const rows = submissions.map(submission => {
    const answerMap = new Map(submission.answers.map(a => [a.name, a.value]));
    const values = [
      submission._id.toString(),
      submission.submittedAt.toISOString(),
      submission.ip || ''
    ];
    
    fieldNames.forEach(name => {
      const value = answerMap.get(name);
      let csvValue = '';
      if (value !== null && value !== undefined) {
        if (Array.isArray(value)) {
          csvValue = value.join('; ');
        } else if (typeof value === 'object') {
          csvValue = JSON.stringify(value);
        } else {
          csvValue = String(value).replace(/"/g, '""');
        }
      }
      values.push(`"${csvValue}"`);
    });
    
    return values.join(',');
  });
  
  return [headers.join(','), ...rows].join('\n');
};

module.exports = {
  generateCSV
};

