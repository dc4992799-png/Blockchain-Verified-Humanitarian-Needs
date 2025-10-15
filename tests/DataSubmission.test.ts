import { describe, it, expect, beforeEach } from "vitest";
import { stringAsciiCV, stringUtf8CV, uintCV, intCV, bufferCV } from "@stacks/transactions";

const ERR_NOT_AUTHORIZED = 100;
const ERR_INVALID_LOCATION = 101;
const ERR_INVALID_NEED_TYPE = 102;
const ERR_INVALID_QUANTITY = 103;
const ERR_INVALID_URGENCY = 104;
const ERR_INVALID_DESCRIPTION = 105;
const ERR_INVALID_HASH = 106;
const ERR_SUBMISSION_ALREADY_EXISTS = 107;
const ERR_SUBMISSION_NOT_FOUND = 108;
const ERR_INVALID_LATITUDE = 112;
const ERR_INVALID_LONGITUDE = 113;
const ERR_INVALID_UNIT = 119;
const ERR_INVALID_CATEGORY = 118;
const ERR_INVALID_EXPIRY = 120;
const ERR_MAX_SUBMISSIONS_EXCEEDED = 115;
const ERR_INVALID_UPDATE_PARAM = 116;

interface Submission {
  location: string;
  latitude: number;
  longitude: number;
  needType: string;
  quantity: number;
  unit: string;
  urgency: number;
  description: string;
  evidenceHash: Buffer;
  timestamp: number;
  submitter: string;
  category: string;
  status: boolean;
  expiry: number;
}

interface SubmissionUpdate {
  updateQuantity: number;
  updateUrgency: number;
  updateDescription: string;
  updateTimestamp: number;
  updater: string;
}

interface Result<T> {
  ok: boolean;
  value: T;
}

class DataSubmissionMock {
  state: {
    nextSubmissionId: number;
    maxSubmissions: number;
    submissionFee: number;
    registryContract: string | null;
    submissions: Map<number, Submission>;
    submissionUpdates: Map<number, SubmissionUpdate>;
    submissionsByHash: Map<string, number>;
  } = {
    nextSubmissionId: 0,
    maxSubmissions: 10000,
    submissionFee: 500,
    registryContract: null,
    submissions: new Map(),
    submissionUpdates: new Map(),
    submissionsByHash: new Map(),
  };
  blockHeight: number = 0;
  caller: string = "ST1TEST";
  registeredUsers: Set<string> = new Set(["ST1TEST"]);
  stxTransfers: Array<{ amount: number; from: string; to: string | null }> = [];

  constructor() {
    this.reset();
  }

  reset() {
    this.state = {
      nextSubmissionId: 0,
      maxSubmissions: 10000,
      submissionFee: 500,
      registryContract: null,
      submissions: new Map(),
      submissionUpdates: new Map(),
      submissionsByHash: new Map(),
    };
    this.blockHeight = 0;
    this.caller = "ST1TEST";
    this.registeredUsers = new Set(["ST1TEST"]);
    this.stxTransfers = [];
  }

  isRegisteredUser(principal: string): Result<boolean> {
    return { ok: true, value: this.registeredUsers.has(principal) };
  }

  setRegistryContract(contractPrincipal: string): Result<boolean> {
    if (this.state.registryContract !== null) {
      return { ok: false, value: false };
    }
    this.state.registryContract = contractPrincipal;
    return { ok: true, value: true };
  }

  setSubmissionFee(newFee: number): Result<boolean> {
    if (!this.state.registryContract) return { ok: false, value: false };
    this.state.submissionFee = newFee;
    return { ok: true, value: true };
  }

  submitData(
    location: string,
    latitude: number,
    longitude: number,
    needType: string,
    quantity: number,
    unit: string,
    urgency: number,
    description: string,
    evidenceHash: Buffer,
    category: string,
    expiry: number
  ): Result<number> {
    if (this.state.nextSubmissionId >= this.state.maxSubmissions) return { ok: false, value: ERR_MAX_SUBMISSIONS_EXCEEDED };
    if (!location || location.length > 50) return { ok: false, value: ERR_INVALID_LOCATION };
    if (latitude < -90000000 || latitude > 90000000) return { ok: false, value: ERR_INVALID_LATITUDE };
    if (longitude < -180000000 || longitude > 180000000) return { ok: false, value: ERR_INVALID_LONGITUDE };
    if (!["food", "water", "shelter", "medical"].includes(needType)) return { ok: false, value: ERR_INVALID_NEED_TYPE };
    if (quantity <= 0) return { ok: false, value: ERR_INVALID_QUANTITY };
    if (!unit || unit.length > 20) return { ok: false, value: ERR_INVALID_UNIT };
    if (urgency < 1 || urgency > 10) return { ok: false, value: ERR_INVALID_URGENCY };
    if (description.length > 500) return { ok: false, value: ERR_INVALID_DESCRIPTION };
    if (evidenceHash.length !== 32) return { ok: false, value: ERR_INVALID_HASH };
    if (!["emergency", "ongoing", "recovery"].includes(category)) return { ok: false, value: ERR_INVALID_CATEGORY };
    if (expiry <= this.blockHeight) return { ok: false, value: ERR_INVALID_EXPIRY };
    if (!this.isRegisteredUser(this.caller).value) return { ok: false, value: ERR_NOT_AUTHORIZED };
    const hashKey = evidenceHash.toString('hex');
    if (this.state.submissionsByHash.has(hashKey)) return { ok: false, value: ERR_SUBMISSION_ALREADY_EXISTS };
    if (!this.state.registryContract) return { ok: false, value: ERR_NOT_AUTHORIZED };

    this.stxTransfers.push({ amount: this.state.submissionFee, from: this.caller, to: this.state.registryContract });

    const id = this.state.nextSubmissionId;
    const submission: Submission = {
      location,
      latitude,
      longitude,
      needType,
      quantity,
      unit,
      urgency,
      description,
      evidenceHash,
      timestamp: this.blockHeight,
      submitter: this.caller,
      category,
      status: true,
      expiry,
    };
    this.state.submissions.set(id, submission);
    this.state.submissionsByHash.set(hashKey, id);
    this.state.nextSubmissionId++;
    return { ok: true, value: id };
  }

  getSubmission(id: number): Submission | null {
    return this.state.submissions.get(id) || null;
  }

  updateSubmission(id: number, updateQuantity: number, updateUrgency: number, updateDescription: string): Result<boolean> {
    const submission = this.state.submissions.get(id);
    if (!submission) return { ok: false, value: false };
    if (submission.submitter !== this.caller) return { ok: false, value: false };
    if (updateQuantity <= 0) return { ok: false, value: false };
    if (updateUrgency < 1 || updateUrgency > 10) return { ok: false, value: false };
    if (updateDescription.length > 500) return { ok: false, value: false };

    const updated: Submission = {
      ...submission,
      quantity: updateQuantity,
      urgency: updateUrgency,
      description: updateDescription,
      timestamp: this.blockHeight,
    };
    this.state.submissions.set(id, updated);
    this.state.submissionUpdates.set(id, {
      updateQuantity,
      updateUrgency,
      updateDescription,
      updateTimestamp: this.blockHeight,
      updater: this.caller,
    });
    return { ok: true, value: true };
  }

  getSubmissionCount(): Result<number> {
    return { ok: true, value: this.state.nextSubmissionId };
  }

  checkSubmissionExistence(hash: Buffer): Result<boolean> {
    const hashKey = hash.toString('hex');
    return { ok: true, value: this.state.submissionsByHash.has(hashKey) };
  }
}

describe("DataSubmission", () => {
  let contract: DataSubmissionMock;

  beforeEach(() => {
    contract = new DataSubmissionMock();
    contract.reset();
  });

  it("submits data successfully", () => {
    contract.setRegistryContract("ST2TEST");
    const evidenceHash = Buffer.alloc(32, 1);
    const result = contract.submitData(
      "DisasterZone1",
      40000000,
      -75000000,
      "food",
      1000,
      "kg",
      8,
      "Urgent food needs",
      evidenceHash,
      "emergency",
      100
    );
    expect(result.ok).toBe(true);
    expect(result.value).toBe(0);

    const submission = contract.getSubmission(0);
    expect(submission?.location).toBe("DisasterZone1");
    expect(submission?.latitude).toBe(40000000);
    expect(submission?.longitude).toBe(-75000000);
    expect(submission?.needType).toBe("food");
    expect(submission?.quantity).toBe(1000);
    expect(submission?.unit).toBe("kg");
    expect(submission?.urgency).toBe(8);
    expect(submission?.description).toBe("Urgent food needs");
    expect(submission?.category).toBe("emergency");
    expect(submission?.expiry).toBe(100);
    expect(contract.stxTransfers).toEqual([{ amount: 500, from: "ST1TEST", to: "ST2TEST" }]);
  });

  it("rejects duplicate evidence hash", () => {
    contract.setRegistryContract("ST2TEST");
    const evidenceHash = Buffer.alloc(32, 1);
    contract.submitData(
      "Zone1",
      40000000,
      -75000000,
      "food",
      1000,
      "kg",
      8,
      "Needs",
      evidenceHash,
      "emergency",
      100
    );
    const result = contract.submitData(
      "Zone2",
      50000000,
      -80000000,
      "water",
      2000,
      "liters",
      9,
      "Water needs",
      evidenceHash,
      "ongoing",
      200
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_SUBMISSION_ALREADY_EXISTS);
  });

  it("rejects non-registered user", () => {
    contract.setRegistryContract("ST2TEST");
    contract.caller = "ST2FAKE";
    contract.registeredUsers = new Set();
    const evidenceHash = Buffer.alloc(32, 2);
    const result = contract.submitData(
      "Zone",
      40000000,
      -75000000,
      "food",
      1000,
      "kg",
      8,
      "Needs",
      evidenceHash,
      "emergency",
      100
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_NOT_AUTHORIZED);
  });

  it("rejects submission without registry contract", () => {
    const evidenceHash = Buffer.alloc(32, 3);
    const result = contract.submitData(
      "NoReg",
      40000000,
      -75000000,
      "food",
      1000,
      "kg",
      8,
      "Needs",
      evidenceHash,
      "emergency",
      100
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_NOT_AUTHORIZED);
  });

  it("rejects invalid latitude", () => {
    contract.setRegistryContract("ST2TEST");
    const evidenceHash = Buffer.alloc(32, 4);
    const result = contract.submitData(
      "InvalidLat",
      91000000,
      -75000000,
      "food",
      1000,
      "kg",
      8,
      "Needs",
      evidenceHash,
      "emergency",
      100
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_LATITUDE);
  });

  it("rejects invalid need type", () => {
    contract.setRegistryContract("ST2TEST");
    const evidenceHash = Buffer.alloc(32, 5);
    const result = contract.submitData(
      "InvalidType",
      40000000,
      -75000000,
      "invalid",
      1000,
      "kg",
      8,
      "Needs",
      evidenceHash,
      "emergency",
      100
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_NEED_TYPE);
  });

  it("updates submission successfully", () => {
    contract.setRegistryContract("ST2TEST");
    const evidenceHash = Buffer.alloc(32, 6);
    contract.submitData(
      "Zone",
      40000000,
      -75000000,
      "food",
      1000,
      "kg",
      8,
      "Old desc",
      evidenceHash,
      "emergency",
      100
    );
    const result = contract.updateSubmission(0, 1500, 9, "New desc");
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    const submission = contract.getSubmission(0);
    expect(submission?.quantity).toBe(1500);
    expect(submission?.urgency).toBe(9);
    expect(submission?.description).toBe("New desc");
    const update = contract.state.submissionUpdates.get(0);
    expect(update?.updateQuantity).toBe(1500);
    expect(update?.updateUrgency).toBe(9);
    expect(update?.updateDescription).toBe("New desc");
    expect(update?.updater).toBe("ST1TEST");
  });

  it("rejects update for non-existent submission", () => {
    contract.setRegistryContract("ST2TEST");
    const result = contract.updateSubmission(99, 1500, 9, "New desc");
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });

  it("rejects update by non-submitter", () => {
    contract.setRegistryContract("ST2TEST");
    const evidenceHash = Buffer.alloc(32, 7);
    contract.submitData(
      "Zone",
      40000000,
      -75000000,
      "food",
      1000,
      "kg",
      8,
      "Desc",
      evidenceHash,
      "emergency",
      100
    );
    contract.caller = "ST3FAKE";
    const result = contract.updateSubmission(0, 1500, 9, "New desc");
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });

  it("sets submission fee successfully", () => {
    contract.setRegistryContract("ST2TEST");
    const result = contract.setSubmissionFee(1000);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    expect(contract.state.submissionFee).toBe(1000);
    const evidenceHash = Buffer.alloc(32, 8);
    contract.submitData(
      "Zone",
      40000000,
      -75000000,
      "food",
      1000,
      "kg",
      8,
      "Desc",
      evidenceHash,
      "emergency",
      100
    );
    expect(contract.stxTransfers).toEqual([{ amount: 1000, from: "ST1TEST", to: "ST2TEST" }]);
  });

  it("rejects submission fee change without registry", () => {
    const result = contract.setSubmissionFee(1000);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });

  it("returns correct submission count", () => {
    contract.setRegistryContract("ST2TEST");
    const evidenceHash1 = Buffer.alloc(32, 9);
    const evidenceHash2 = Buffer.alloc(32, 10);
    contract.submitData(
      "Zone1",
      40000000,
      -75000000,
      "food",
      1000,
      "kg",
      8,
      "Desc1",
      evidenceHash1,
      "emergency",
      100
    );
    contract.submitData(
      "Zone2",
      50000000,
      -80000000,
      "water",
      2000,
      "liters",
      9,
      "Desc2",
      evidenceHash2,
      "ongoing",
      200
    );
    const result = contract.getSubmissionCount();
    expect(result.ok).toBe(true);
    expect(result.value).toBe(2);
  });

  it("checks submission existence correctly", () => {
    contract.setRegistryContract("ST2TEST");
    const evidenceHash = Buffer.alloc(32, 11);
    contract.submitData(
      "Zone",
      40000000,
      -75000000,
      "food",
      1000,
      "kg",
      8,
      "Desc",
      evidenceHash,
      "emergency",
      100
    );
    const result = contract.checkSubmissionExistence(evidenceHash);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    const fakeHash = Buffer.alloc(32, 12);
    const result2 = contract.checkSubmissionExistence(fakeHash);
    expect(result2.ok).toBe(true);
    expect(result2.value).toBe(false);
  });

  it("rejects submission with empty location", () => {
    contract.setRegistryContract("ST2TEST");
    const evidenceHash = Buffer.alloc(32, 13);
    const result = contract.submitData(
      "",
      40000000,
      -75000000,
      "food",
      1000,
      "kg",
      8,
      "Desc",
      evidenceHash,
      "emergency",
      100
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_LOCATION);
  });

  it("rejects submission with max submissions exceeded", () => {
    contract.setRegistryContract("ST2TEST");
    contract.state.maxSubmissions = 1;
    const evidenceHash1 = Buffer.alloc(32, 14);
    const evidenceHash2 = Buffer.alloc(32, 15);
    contract.submitData(
      "Zone1",
      40000000,
      -75000000,
      "food",
      1000,
      "kg",
      8,
      "Desc1",
      evidenceHash1,
      "emergency",
      100
    );
    const result = contract.submitData(
      "Zone2",
      50000000,
      -80000000,
      "water",
      2000,
      "liters",
      9,
      "Desc2",
      evidenceHash2,
      "ongoing",
      200
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_MAX_SUBMISSIONS_EXCEEDED);
  });

  it("sets registry contract successfully", () => {
    const result = contract.setRegistryContract("ST2TEST");
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    expect(contract.state.registryContract).toBe("ST2TEST");
  });
});