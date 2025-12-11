/**
 * FHIR R4 Validation Helpers
 * Common validation utilities for FHIR resources
 */

// Validate FHIR resource type
function isValidResourceType(resourceType) {
  const validTypes = [
    "Patient",
    "Observation",
    "Condition",
    "RiskAssessment",
    "Bundle",
    "OperationOutcome",
  ];
  return validTypes.includes(resourceType);
}

// Validate FHIR date format (YYYY-MM-DD)
function isValidFHIRDate(dateString) {
  if (!dateString) return false;
  const regex = /^\d{4}(-\d{2}(-\d{2})?)?$/;
  return regex.test(dateString);
}

// Validate FHIR dateTime format
function isValidFHIRDateTime(dateTimeString) {
  if (!dateTimeString) return false;
  try {
    const date = new Date(dateTimeString);
    return !isNaN(date.getTime());
  } catch {
    return false;
  }
}

// Validate reference format (ResourceType/id)
function isValidReference(reference) {
  if (!reference) return false;
  const regex = /^[A-Z][a-zA-Z]+\/[A-Za-z0-9\-\.]{1,64}$/;
  return regex.test(reference);
}

// Validate coding system
function isValidCodingSystem(system) {
  if (!system) return true; // Optional
  const validSystems = [
    "http://loinc.org",
    "http://snomed.info/sct",
    "http://hl7.org/fhir/sid/icd-10",
    "http://unitsofmeasure.org",
    "http://terminology.hl7.org/CodeSystem/",
  ];
  return validSystems.some((validSystem) => system.startsWith(validSystem));
}

// Validate observation status
function isValidObservationStatus(status) {
  const validStatuses = [
    "registered",
    "preliminary",
    "final",
    "amended",
    "corrected",
    "cancelled",
    "entered-in-error",
    "unknown",
  ];
  return validStatuses.includes(status);
}

// Validate condition clinical status
function isValidConditionClinicalStatus(code) {
  const validStatuses = [
    "active",
    "recurrence",
    "relapse",
    "inactive",
    "remission",
    "resolved",
  ];
  return validStatuses.includes(code);
}

// Create FHIR OperationOutcome for errors
function createOperationOutcome(severity, code, diagnostics) {
  return {
    resourceType: "OperationOutcome",
    issue: [
      {
        severity: severity || "error",
        code: code || "exception",
        diagnostics: diagnostics || "An error occurred",
      },
    ],
  };
}

// Validate Patient resource
function validatePatient(patient) {
  const errors = [];

  if (!patient.resourceType || patient.resourceType !== "Patient") {
    errors.push("resourceType must be 'Patient'");
  }

  if (patient.birthDate && !isValidFHIRDate(patient.birthDate)) {
    errors.push("birthDate must be in YYYY-MM-DD format");
  }

  if (
    patient.gender &&
    !["male", "female", "other", "unknown"].includes(patient.gender)
  ) {
    errors.push("gender must be one of: male, female, other, unknown");
  }

  return errors;
}

// Validate Observation resource
function validateObservation(observation) {
  const errors = [];

  if (!observation.resourceType || observation.resourceType !== "Observation") {
    errors.push("resourceType must be 'Observation'");
  }

  if (!observation.status) {
    errors.push("status is required");
  } else if (!isValidObservationStatus(observation.status)) {
    errors.push(
      "status must be one of: registered, preliminary, final, amended, corrected, cancelled, entered-in-error, unknown"
    );
  }

  if (!observation.code) {
    errors.push("code is required");
  }

  if (
    observation.subject &&
    observation.subject.reference &&
    !isValidReference(observation.subject.reference)
  ) {
    errors.push("subject.reference must be in format ResourceType/id");
  }

  return errors;
}

// Validate Condition resource
function validateCondition(condition) {
  const errors = [];

  if (!condition.resourceType || condition.resourceType !== "Condition") {
    errors.push("resourceType must be 'Condition'");
  }

  if (!condition.code) {
    errors.push("code is required");
  }

  if (
    condition.subject &&
    condition.subject.reference &&
    !isValidReference(condition.subject.reference)
  ) {
    errors.push("subject.reference must be in format ResourceType/id");
  }

  return errors;
}

// Validate RiskAssessment resource
function validateRiskAssessment(risk) {
  const errors = [];

  if (
    !risk.resourceType ||
    risk.resourceType !== "RiskAssessment"
  ) {
    errors.push("resourceType must be 'RiskAssessment'");
  }

  if (!risk.status) {
    errors.push("status is required");
  }

  if (
    risk.subject &&
    risk.subject.reference &&
    !isValidReference(risk.subject.reference)
  ) {
    errors.push("subject.reference must be in format ResourceType/id");
  }

  if (
    risk.prediction &&
    Array.isArray(risk.prediction) &&
    risk.prediction.length > 0
  ) {
    risk.prediction.forEach((pred, index) => {
      if (
        pred.probabilityDecimal !== undefined &&
        (pred.probabilityDecimal < 0 || pred.probabilityDecimal > 1)
      ) {
        errors.push(
          `prediction[${index}].probabilityDecimal must be between 0 and 1`
        );
      }
    });
  }

  return errors;
}

// Express middleware for FHIR resource validation
function fhirValidationMiddleware(req, res, next) {
  if (req.method === "POST" || req.method === "PUT") {
    const resource = req.body;
    let errors = [];

    if (!resource || !resource.resourceType) {
      return res.status(400).json(
        createOperationOutcome(
          "error",
          "invalid",
          "Request body must contain a valid FHIR resource with resourceType"
        )
      );
    }

    // Validate based on resource type
    switch (resource.resourceType) {
      case "Patient":
        errors = validatePatient(resource);
        break;
      case "Observation":
        errors = validateObservation(resource);
        break;
      case "Condition":
        errors = validateCondition(resource);
        break;
      case "RiskAssessment":
        errors = validateRiskAssessment(resource);
        break;
      default:
        if (!isValidResourceType(resource.resourceType)) {
          errors.push(`Unsupported resource type: ${resource.resourceType}`);
        }
    }

    if (errors.length > 0) {
      return res.status(400).json(
        createOperationOutcome("error", "invalid", errors.join("; "))
      );
    }
  }

  next();
}

module.exports = {
  isValidResourceType,
  isValidFHIRDate,
  isValidFHIRDateTime,
  isValidReference,
  isValidCodingSystem,
  isValidObservationStatus,
  isValidConditionClinicalStatus,
  createOperationOutcome,
  validatePatient,
  validateObservation,
  validateCondition,
  validateRiskAssessment,
  fhirValidationMiddleware,
};
