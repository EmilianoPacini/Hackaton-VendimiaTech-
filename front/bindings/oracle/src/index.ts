import { Buffer } from "buffer";
import { Address } from "@stellar/stellar-sdk";
import {
  AssembledTransaction,
  Client as ContractClient,
  ClientOptions as ContractClientOptions,
  MethodOptions,
  Result,
  Spec as ContractSpec,
} from "@stellar/stellar-sdk/contract";
import type {
  u32,
  i32,
  u64,
  i64,
  u128,
  i128,
  u256,
  i256,
  Option,
  Timepoint,
  Duration,
} from "@stellar/stellar-sdk/contract";
export * from "@stellar/stellar-sdk";
export * as contract from "@stellar/stellar-sdk/contract";
export * as rpc from "@stellar/stellar-sdk/rpc";

if (typeof window !== "undefined") {
  //@ts-ignore Buffer exists
  window.Buffer = window.Buffer || Buffer;
}


export const networks = {
  testnet: {
    networkPassphrase: "Test SDF Network ; September 2015",
    contractId: "CDGCLMNTFUCWLUKHAYVEQXRQKKVFZAC7PDHAIHLSEDLW23BODA4BTEM2",
  }
} as const

export type DataKey = {tag: "Admin", values: void} | {tag: "Price", values: readonly [string, string]};

export interface Client {
  /**
   * Construct and simulate a get_price transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Get the latest price for a pair. Panics if not found.
   */
  get_price: ({base, quote}: {base: string, quote: string}, options?: MethodOptions) => Promise<AssembledTransaction<i128>>

  /**
   * Construct and simulate a set_price transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Set a price for a pair (base, quote). Only admin can do this.
   * Price should be in 7 decimals. E.g. 1 XAU = $2500 -> 25000000000
   */
  set_price: ({base, quote, price}: {base: string, quote: string, price: i128}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a initialize transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Initialize the oracle with an admin
   */
  initialize: ({admin}: {admin: string}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

}
export class Client extends ContractClient {
  static async deploy<T = Client>(
    /** Options for initializing a Client as well as for calling a method, with extras specific to deploying. */
    options: MethodOptions &
      Omit<ContractClientOptions, "contractId"> & {
        /** The hash of the Wasm blob, which must already be installed on-chain. */
        wasmHash: Buffer | string;
        /** Salt used to generate the contract's ID. Passed through to {@link Operation.createCustomContract}. Default: random. */
        salt?: Buffer | Uint8Array;
        /** The format used to decode `wasmHash`, if it's provided as a string. */
        format?: "hex" | "base64";
      }
  ): Promise<AssembledTransaction<T>> {
    return ContractClient.deploy(null, options)
  }
  constructor(public readonly options: ContractClientOptions) {
    super(
      new ContractSpec([ "AAAAAgAAAAAAAAAAAAAAB0RhdGFLZXkAAAAAAgAAAAAAAAAAAAAABUFkbWluAAAAAAAAAQAAAAAAAAAFUHJpY2UAAAAAAAACAAAAEQAAABE=",
        "AAAAAAAAADVHZXQgdGhlIGxhdGVzdCBwcmljZSBmb3IgYSBwYWlyLiBQYW5pY3MgaWYgbm90IGZvdW5kLgAAAAAAAAlnZXRfcHJpY2UAAAAAAAACAAAAAAAAAARiYXNlAAAAEQAAAAAAAAAFcXVvdGUAAAAAAAARAAAAAQAAAAs=",
        "AAAAAAAAAH5TZXQgYSBwcmljZSBmb3IgYSBwYWlyIChiYXNlLCBxdW90ZSkuIE9ubHkgYWRtaW4gY2FuIGRvIHRoaXMuClByaWNlIHNob3VsZCBiZSBpbiA3IGRlY2ltYWxzLiBFLmcuIDEgWEFVID0gJDI1MDAgLT4gMjUwMDAwMDAwMDAAAAAAAAlzZXRfcHJpY2UAAAAAAAADAAAAAAAAAARiYXNlAAAAEQAAAAAAAAAFcXVvdGUAAAAAAAARAAAAAAAAAAVwcmljZQAAAAAAAAsAAAAA",
        "AAAAAAAAACNJbml0aWFsaXplIHRoZSBvcmFjbGUgd2l0aCBhbiBhZG1pbgAAAAAKaW5pdGlhbGl6ZQAAAAAAAQAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAA==" ]),
      options
    )
  }
  public readonly fromJSON = {
    get_price: this.txFromJSON<i128>,
        set_price: this.txFromJSON<null>,
        initialize: this.txFromJSON<null>
  }
}