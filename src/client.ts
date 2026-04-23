import type { Firestore } from "firebase/firestore";
import { ActivitiesClient } from "./activities/index.ts";
import type { AuthSession } from "./auth.ts";
import { signInWithCredentials } from "./auth.ts";
import { DiapersClient } from "./diapers/index.ts";
import { AuthenticationError } from "./errors.ts";
import { FeedClient } from "./feed/index.ts";
import { HealthClient } from "./health/index.ts";
import { PumpClient } from "./pump/index.ts";
import { SleepClient } from "./sleep/index.ts";
import { SolidsClient } from "./solids/index.ts";
import { UserClient } from "./user/index.ts";

export interface ClientContext {
  firestore: Firestore;
  uid: string;
  // Returns a fresh ID token suitable for the Firebase Storage call used by
  // solids.listCuratedFoods(). Returning a Promise lets the Firebase SDK
  // transparently refresh when the token is near expiry.
  getIdToken: () => Promise<string>;
  fetch: typeof fetch;
}

// Thunk passed to each sub-client; resolves the context, lazy-connecting on
// first call. Centralising it here means sub-clients never see raw auth state.
export type ContextResolver = () => Promise<ClientContext>;

export interface HuckleberryOptions {
  email: string;
  password: string;

  // IANA timezone (e.g. "America/New_York"). Only used for future write paths
  // (computing Huckleberry's sign-flipped offset-minutes); reads surface the
  // stored offset verbatim.
  timezone?: string;

  // --- Advanced: dependency injection hooks for tests ---
  // Provide a preconfigured Firestore instance to bypass the real Firebase
  // sign-in flow entirely. When set, `email`/`password` are ignored and the
  // client enters connected state immediately.
  firestoreOverride?: Firestore;
  uidOverride?: string;
  idTokenProvider?: () => Promise<string>;
  fetchOverride?: typeof fetch;
}

export class Huckleberry {
  readonly user: UserClient;
  readonly sleep: SleepClient;
  readonly feed: FeedClient;
  readonly diapers: DiapersClient;
  readonly activities: ActivitiesClient;
  readonly pump: PumpClient;
  readonly health: HealthClient;
  readonly solids: SolidsClient;

  readonly timezone: string | undefined;

  private readonly options: HuckleberryOptions;
  private session: AuthSession | undefined;
  private context: ClientContext | undefined;
  private connectPromise: Promise<ClientContext> | undefined;

  constructor(options: HuckleberryOptions) {
    this.options = options;
    this.timezone = options.timezone;

    if (options.firestoreOverride) {
      this.context = {
        firestore: options.firestoreOverride,
        uid: options.uidOverride ?? "test-uid",
        getIdToken:
          options.idTokenProvider ?? (() => Promise.resolve("test-token")),
        fetch: options.fetchOverride ?? fetch,
      };
    }

    const resolve: ContextResolver = () => this.ensureConnected();
    this.user = new UserClient(resolve);
    this.sleep = new SleepClient(resolve);
    this.feed = new FeedClient(resolve);
    this.diapers = new DiapersClient(resolve);
    this.activities = new ActivitiesClient(resolve);
    this.pump = new PumpClient(resolve);
    this.health = new HealthClient(resolve);
    this.solids = new SolidsClient(resolve);
  }

  async connect(): Promise<void> {
    await this.ensureConnected();
  }

  async ensureConnected(): Promise<ClientContext> {
    if (this.context) return this.context;
    if (!this.connectPromise) {
      this.connectPromise = this.doConnect().catch((err) => {
        this.connectPromise = undefined;
        throw err;
      });
    }
    return this.connectPromise;
  }

  private async doConnect(): Promise<ClientContext> {
    const { email, password } = this.options;
    if (!email || !password) {
      throw new AuthenticationError(
        "Huckleberry requires `email` and `password` (or a `firestoreOverride` for tests).",
      );
    }
    const session = await signInWithCredentials(email, password);
    this.session = session;
    this.context = {
      firestore: session.firestore,
      uid: session.uid,
      getIdToken: session.getIdToken,
      fetch: this.options.fetchOverride ?? fetch,
    };
    return this.context;
  }

  async close(): Promise<void> {
    if (this.session) {
      await this.session.signOut();
      this.session = undefined;
    }
    this.context = undefined;
    this.connectPromise = undefined;
  }
}
