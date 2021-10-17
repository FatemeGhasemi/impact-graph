export interface TransactionDetailInput {
  txHash: string,
  symbol: string,
  networkId: number,
  fromAddress :string,
  toAddress :string,
  amount :number,
  nonce ?:number,
}


export interface NetworkTransactionInfo {
  hash: string;
  amount: number;
  nonce ?: number;
  from: string;
  to: string;
  currency: string
  speedup ?:boolean,

}