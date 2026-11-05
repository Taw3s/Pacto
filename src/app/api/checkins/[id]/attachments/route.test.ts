import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getClaims: vi.fn(),
  checkin: vi.fn(),
  upload: vi.fn(),
  remove: vi.fn(),
  insert: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getClaims: mocks.getClaims },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: mocks.checkin }) }) }),
  }),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    storage: { from: () => ({ upload: mocks.upload, remove: mocks.remove }) },
    from: () => ({ insert: mocks.insert }),
  }),
}));

import { POST } from "./route";

const OWNER = "96000000-0000-0000-0000-000000000002";
const GROUP = "96000000-0000-0000-0000-000000000001";
const CHECKIN = "96000000-0000-0000-0000-000000000003";

function request(file: File) {
  const form = new FormData();
  form.set("file", file);
  return new Request(`http://localhost/api/checkins/${CHECKIN}/attachments`, {
    method: "POST",
    headers: { origin: "http://localhost" },
    body: form,
  });
}

describe("POST /api/checkins/[id]/attachments", () => {
  beforeEach(() => {
    mocks.getClaims.mockResolvedValue({ data: { claims: { sub: OWNER } } });
    mocks.checkin.mockResolvedValue({ data: { id: CHECKIN, user_id: OWNER, group_id: GROUP, goal: "study" } });
    mocks.upload.mockResolvedValue({ error: null });
    mocks.remove.mockResolvedValue({ error: null });
    mocks.insert.mockResolvedValue({ error: null });
  });
  afterEach(() => vi.clearAllMocks());

  it("requires an authenticated owner", async () => {
    mocks.getClaims.mockResolvedValue({ data: { claims: {} } });
    const response = await POST(request(new File(["%PDF-1.7"], "lesson.pdf")), { params: Promise.resolve({ id: CHECKIN }) });
    expect(response.status).toBe(401);
    expect(mocks.upload).not.toHaveBeenCalled();
  });

  it("rejects a valid file when the caller does not own the proof", async () => {
    mocks.checkin.mockResolvedValue({ data: { id: CHECKIN, user_id: "another-user", group_id: GROUP, goal: "study" } });
    const response = await POST(request(new File(["%PDF-1.7"], "lesson.pdf")), { params: Promise.resolve({ id: CHECKIN }) });
    expect(response.status).toBe(403);
    expect(mocks.upload).not.toHaveBeenCalled();
  });

  it("rejects a forged PDF before storage and saves metadata after a valid upload", async () => {
    const forged = await POST(request(new File(["not a PDF"], "lesson.pdf")), { params: Promise.resolve({ id: CHECKIN }) });
    expect(forged.status).toBe(400);
    expect(mocks.upload).not.toHaveBeenCalled();

    const valid = await POST(request(new File(["%PDF-1.7"], "lesson.pdf")), { params: Promise.resolve({ id: CHECKIN }) });
    expect(valid.status).toBe(201);
    expect(mocks.upload).toHaveBeenCalledOnce();
    expect(mocks.insert).toHaveBeenCalledOnce();
  });

  it("removes the uploaded object if metadata cannot be saved", async () => {
    mocks.insert.mockResolvedValue({ error: { code: "23505" } });
    const response = await POST(request(new File(["%PDF-1.7"], "lesson.pdf")), { params: Promise.resolve({ id: CHECKIN }) });
    expect(response.status).toBe(409);
    expect(mocks.remove).toHaveBeenCalledOnce();
  });

  it("only accepts a ZIP for a project proof", async () => {
    mocks.checkin.mockResolvedValue({ data: { id: CHECKIN, user_id: OWNER, group_id: GROUP, goal: "project" } });
    const response = await POST(request(new File([Uint8Array.from([0x50, 0x4b, 3, 4])], "source.zip")), { params: Promise.resolve({ id: CHECKIN }) });
    expect(response.status).toBe(201);
  });
});
