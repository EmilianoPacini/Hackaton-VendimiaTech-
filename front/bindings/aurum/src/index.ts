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
    contractId: "CCJUJUBPQA3S3VJ6NWGF2FLYARSPIXWLGMVRHOZDBHSKXYBQMMZZEMZ5",
  }
} as const

export type DataKey = {tag: "Admin", values: void} | {tag: "GoldToken", values: void} | {tag: "OracleAddress", values: void};



export interface Client {
  /**
   * Construct and simulate a get_admin transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_admin: (options?: MethodOptions) => Promise<AssembledTransaction<string>>

  /**
   * Construct and simulate a initialize transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Initialize the AURUM payment contract.
   * 
   * - `admin`: The administrator address.
   * - `gold_token`: The contract address of the GOLD token (SAC).
   * - `oracle_address`: Address of the mock On-Chain Oracle.
   */
  initialize: ({admin, gold_token, oracle_address}: {admin: string, gold_token: string, oracle_address: string}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a pay_with_rwa transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Pay with RWA (GOLD). This is the star function.
   */
  pay_with_rwa: ({sender, destination, amount_fiat, max_gold_to_spend}: {sender: string, destination: string, amount_fiat: i128, max_gold_to_spend: i128}, options?: MethodOptions) => Promise<AssembledTransaction<i128>>

  /**
   * Construct and simulate a get_gold_token transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_gold_token: (options?: MethodOptions) => Promise<AssembledTransaction<string>>

  /**
   * Construct and simulate a get_oracle_address transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_oracle_address: (options?: MethodOptions) => Promise<AssembledTransaction<string>>

  /**
   * Construct and simulate a get_payment_preview transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Calculate how much GOLD is needed to pay a given fiat amount.
   * 
   * Returns the amount of GOLD (with 7 decimals) required.
   */
  get_payment_preview: ({amount_fiat}: {amount_fiat: i128}, options?: MethodOptions) => Promise<AssembledTransaction<i128>>

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
      new ContractSpec([ "AAAAAgAAAAAAAAAAAAAAB0RhdGFLZXkAAAAAAwAAAAAAAAAAAAAABUFkbWluAAAAAAAAAAAAAAAAAAAJR29sZFRva2VuAAAAAAAAAAAAAAAAAAANT3JhY2xlQWRkcmVzcwAAAA==",
        "AAAABQAAAAAAAAAAAAAACUluaXRFdmVudAAAAAAAAAEAAAAKaW5pdF9ldmVudAAAAAAAAwAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAAAAAAAAAAAKZ29sZF90b2tlbgAAAAAAEwAAAAAAAAAAAAAADm9yYWNsZV9hZGRyZXNzAAAAAAATAAAAAAAAAAI=",
        "AAAAAAAAAAAAAAAJZ2V0X2FkbWluAAAAAAAAAAAAAAEAAAAT",
        "AAAABQAAAAAAAAAAAAAAD1BheW1lbnRFeGVjdXRlZAAAAAABAAAAEHBheW1lbnRfZXhlY3V0ZWQAAAAEAAAAAAAAAAZzZW5kZXIAAAAAABMAAAAAAAAAAAAAAAtkZXN0aW5hdGlvbgAAAAATAAAAAAAAAAAAAAALYW1vdW50X2ZpYXQAAAAACwAAAAAAAAAAAAAACWdvbGRfdXNlZAAAAAAAAAsAAAAAAAAAAg==",
        "AAAAAAAAAMRJbml0aWFsaXplIHRoZSBBVVJVTSBwYXltZW50IGNvbnRyYWN0LgoKLSBgYWRtaW5gOiBUaGUgYWRtaW5pc3RyYXRvciBhZGRyZXNzLgotIGBnb2xkX3Rva2VuYDogVGhlIGNvbnRyYWN0IGFkZHJlc3Mgb2YgdGhlIEdPTEQgdG9rZW4gKFNBQykuCi0gYG9yYWNsZV9hZGRyZXNzYDogQWRkcmVzcyBvZiB0aGUgbW9jayBPbi1DaGFpbiBPcmFjbGUuAAAACmluaXRpYWxpemUAAAAAAAMAAAAAAAAABWFkbWluAAAAAAAAEwAAAAAAAAAKZ29sZF90b2tlbgAAAAAAEwAAAAAAAAAOb3JhY2xlX2FkZHJlc3MAAAAAABMAAAAA",
        "AAAAAAAAAC9QYXkgd2l0aCBSV0EgKEdPTEQpLiBUaGlzIGlzIHRoZSBzdGFyIGZ1bmN0aW9uLgAAAAAMcGF5X3dpdGhfcndhAAAAAwAAAAAAAAAGc2VuZGVyAAAAAAATAAAAAAAAAAtkZXN0aW5hdGlvbgAAAAATAAAAAAAAAAthbW91bnRfZmlhdAAAAAALAAAAAQAAAAs=",
        "AAAAAAAAAAAAAAAOZ2V0X2dvbGRfdG9rZW4AAAAAAAAAAAABAAAAEw==",
        "AAAAAAAAAAAAAAASZ2V0X29yYWNsZV9hZGRyZXNzAAAAAAAAAAAAAQAAABM=",
        "AAAAAAAAAHVDYWxjdWxhdGUgaG93IG11Y2ggR09MRCBpcyBuZWVkZWQgdG8gcGF5IGEgZ2l2ZW4gZmlhdCBhbW91bnQuCgpSZXR1cm5zIHRoZSBhbW91bnQgb2YgR09MRCAod2l0aCA3IGRlY2ltYWxzKSByZXF1aXJlZC4AAAAAAAATZ2V0X3BheW1lbnRfcHJldmlldwAAAAABAAAAAAAAAAthbW91bnRfZmlhdAAAAAALAAAAAQAAAAs=" ]),
      options
    )
  }
  public readonly fromJSON = {
    get_admin: this.txFromJSON<string>,
        initialize: this.txFromJSON<null>,
        pay_with_rwa: this.txFromJSON<i128>,
        get_gold_token: this.txFromJSON<string>,
        get_oracle_address: this.txFromJSON<string>,
        get_payment_preview: this.txFromJSON<i128>
  }
}