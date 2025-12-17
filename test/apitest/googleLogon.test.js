require("dotenv").config();
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
const prisma = require("../../db/prisma");
const httpMocks = require("node-mocks-http");
const EventEmitter = require("events").EventEmitter;

jest.mock("google-auth-library", () => {
  const verifyIdTokenMock = jest.fn();
  verifyIdTokenMock.mockImplementation(async ({ idToken }) => {
    if (idToken === "bad") {
      throw new Error("Invalid token");
    }

    return {
      getPayload: () => idToken,
    };
  });
  return {
    OAuth2Client: jest.fn().mockImplementation(() => {
      return {
        verifyIdToken: verifyIdTokenMock,
      };
    }),
  };
});
const {
  googleLogon: apiGoogleLogon,
} = require("../../controllers/apiUserController");
const waitForRouteHandlerCompletion = require("../waitForRouteHandlerCompletion.js");
const { googleLogon } = require("../../controllers/userController");
let saveRes = null;
let saveData = null;
const cookie = require("cookie");
function MockResponseWithCookies() {
  const res = httpMocks.createResponse({
    eventEmitter: EventEmitter,
  });
  res.cookie = (name, value, options = {}) => {
    const serialized = cookie.serialize(name, String(value), options);
    let currentHeader = res.getHeader("Set-Cookie");
    if (currentHeader === undefined) {
      currentHeader = [];
    }
    currentHeader.push(serialized);
    res.setHeader("Set-Cookie", currentHeader);
  };
  return res;
}
let fetchSpy;

beforeAll(async () => {
  // clear database
  await prisma.task.deleteMany(); // delete all tasks
  await prisma.user.deleteMany(); // delete all users
  await prisma.user.create({
    data: { name: "Bob", email: "bob@sample.com", hashedPassword: "wontwork" },
  });
  fetchSpy = jest.spyOn(global, "fetch");
  fetchSpy.mockImplementation(async (url, opts) => {
    opts.body = JSON.parse(opts.body);
    if (opts.body.code === 2) {
      // Bob's email
      return {
        ok: true,
        json: async () => {
          return {
            id_token: {
              name: "Bob",
              email: "bob@sample.com",
              email_verified: true,
            },
          };
        },
      };
    }
    if (opts.body.code === 3) {
      // Manuel's email
      return {
        ok: true,
        json: async () => {
          return {
            id_token: {
              name: "Manuel",
              email: "manuel@sample.com",
              email_verified: true,
            },
          };
        },
      };
    }
    if (opts.body.code === 4) {
      // Padma's email
      return {
        ok: true,
        json: async () => {
          return {
            id_token: {
              name: "Padma",
              email: "padma@sample.com",
              email_verified: true,
            },
          };
        },
      };
    }
    return { ok: false };
  });
});
afterAll(() => {
  fetchSpy.mockRestore();
  prisma.$disconnect();
});

let jwtCookie;

describe("google logon tests", () => {
  it("90. reports an error with a bad code", async () => {
    const req = httpMocks.createRequest({
      method: "POST",
      body: { code: 1 },
    });
    saveRes = httpMocks.createResponse({
      eventEmitter: EventEmitter,
    });
    await waitForRouteHandlerCompletion(apiGoogleLogon, req, saveRes);
    expect(saveRes.statusCode).toBe(401);
  });
  it("91. returns a 200 for Bob", async () => {
    const req = httpMocks.createRequest({
      method: "POST",
      body: { code: 2 },
    });
    saveRes = MockResponseWithCookies();
    await waitForRouteHandlerCompletion(apiGoogleLogon, req, saveRes);
    expect(saveRes.statusCode).toBe(200);
  });
  it("92. A string in the Set-Cookie array starts with jwt=.", () => {
    const setCookieArray = saveRes.get("Set-Cookie");
    jwtCookie = setCookieArray.find((str) => str.startsWith("jwt="));
    expect(jwtCookie).toBeDefined();
  });
  it("93. returns the expected name.", () => {
    saveData = saveRes._getJSONData();
    expect(saveData.name).toBe("Bob");
  });
  it("94. returns a 201 for Manuel", async () => {
    const req = httpMocks.createRequest({
      method: "POST",
      body: { code: 3 },
    });
    saveRes = MockResponseWithCookies();
    await waitForRouteHandlerCompletion(apiGoogleLogon, req, saveRes);
    expect(saveRes.statusCode).toBe(201);
  });
  it("95. A string in the Set-Cookie array starts with jwt=.", () => {
    const setCookieArray = saveRes.get("Set-Cookie");
    jwtCookie = setCookieArray.find((str) => str.startsWith("jwt="));
    expect(jwtCookie).toBeDefined();
  });
  it("96. returns the expected name.", () => {
    saveData = saveRes._getJSONData();
    expect(saveData.user.name).toBe("Manuel");
  });
  it("97. reports an error with a bad code", async () => {
    const req = httpMocks.createRequest({
      method: "POST",
      body: { code: 1 },
    });
    saveRes = httpMocks.createResponse({
      eventEmitter: EventEmitter,
    });
    await waitForRouteHandlerCompletion(googleLogon, req, saveRes);
    expect(saveRes.statusCode).toBe(401);
  });
  it("98. returns a 200 for Bob", async () => {
    const req = httpMocks.createRequest({
      method: "POST",
      body: { code: 2 },
    });
    saveRes = MockResponseWithCookies();
    await waitForRouteHandlerCompletion(googleLogon, req, saveRes);
    expect(saveRes.statusCode).toBe(200);
  });
  it("99. A string in the Set-Cookie array starts with jwt=.", () => {
    const setCookieArray = saveRes.get("Set-Cookie");
    jwtCookie = setCookieArray.find((str) => str.startsWith("jwt="));
    expect(jwtCookie).toBeDefined();
  });
  it("100. returns the expected name.", () => {
    saveData = saveRes._getJSONData();
    expect(saveData.name).toBe("Bob");
  });
  it("101. returns a 200 for Padma", async () => {
    const req = httpMocks.createRequest({
      method: "POST",
      body: { code: 4 },
    });
    saveRes = MockResponseWithCookies();
    await waitForRouteHandlerCompletion(googleLogon, req, saveRes);
    expect(saveRes.statusCode).toBe(200);
  });
  it("102. A string in the Set-Cookie array starts with jwt=.", () => {
    const setCookieArray = saveRes.get("Set-Cookie");
    jwtCookie = setCookieArray.find((str) => str.startsWith("jwt="));
    expect(jwtCookie).toBeDefined();
  });
  it("103. returns the expected name.", () => {
    saveData = saveRes._getJSONData();
    expect(saveData.name).toBe("Padma");
  });
});
