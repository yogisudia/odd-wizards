"use client";
import { useEffect, useState } from "react";
import Gallery1 from "./Gallery1";
import Gallery2 from "./Gallery2";
import Gallery3 from "./Gallery3";
import Gallery4 from "./Gallery4";
import axios from "axios";
import getConfig from "@/config/config";
import { OwnedTokensResponse, Token } from "@/types";
import Loading from "../Loading";

export interface NFTGalleryProps {
  address: string,
  types: string[] | []
}

export default function NFTGallery({ address, types }: NFTGalleryProps) {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState<number>(0);
  const limit = 16;

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        let resp = await axios.get(`/api/user/nfts/${address}?${types.length > 0 ? `type=${types.join(",")}` : ""}&limit=${limit}&page=${page}`)
        const data: OwnedTokensResponse = resp.data.data;
        setTokens((prev) => [...prev, ...data.tokens]);
        setHasMore(data.pageInfo.total > (page + 1) * limit);
      } catch (error) {
        console.error("Error fetching nfts data:", error);
      }
      setLoading(false);
    }

    fetchData();
  }, [page]);

  useEffect(() => {
    async function fetchData() {
      setTokens([]);
      setPage(0);
      setLoading(true);
      try {
        let resp = await axios.get(`/api/user/nfts/${address}?${types.length > 0 ? `type=${types.join(",")}` : ""}&limit=${limit}&page=${page}`)
        const data: OwnedTokensResponse = resp.data.data;
        setTokens(data.tokens);
        setHasMore(data.pageInfo.total > (page + 1) * limit);
      } catch (error) {
        console.error("Error fetching nfts data:", error);
      }
      setLoading(false);
    }

    fetchData();
  }, [types]);

  const renderGallery = (tokens: Token[]) => {
    const galleries = [];
    const chunksCount = Math.ceil(tokens.length / 16);

    for (let chunk = 0; chunk < chunksCount; chunk++) {
      const startIndex = chunk * 16;

      if (chunk % 2 == 0) {
        // Create fixed-size arrays for each gallery section
        const gallery1Tokens = tokens.slice(startIndex, startIndex + 3).concat(
          Array(3 - Math.min(tokens.slice(startIndex, startIndex + 3).length, 3)).fill(null)
        );

        const gallery2Tokens = tokens.slice(startIndex + 3, startIndex + 4).concat(
          Array(1 - Math.min(tokens.slice(startIndex + 3, startIndex + 4).length, 1)).fill(null)
        );

        const gallery3Tokens = tokens.slice(startIndex + 4, startIndex + 10).concat(
          Array(6 - Math.min(tokens.slice(startIndex + 4, startIndex + 10).length, 6)).fill(null)
        );

        const gallery4Tokens = tokens.slice(startIndex + 10, startIndex + 16).concat(
          Array(6 - Math.min(tokens.slice(startIndex + 10, startIndex + 16).length, 6)).fill(null)
        );

        // Always push all galleries with their respective padded tokens
        galleries.push(
          <Gallery1
            address={address}
            key={`gallery1-${chunk}`}
            tokens={gallery1Tokens}
            allTokens={tokens}
          />
        );

        galleries.push(
          <Gallery2
            address={address}
            key={`gallery2-${chunk}`}
            tokens={gallery2Tokens}
            allTokens={tokens}
          />
        );

        galleries.push(
          <Gallery3
            address={address}
            key={`gallery3-${chunk}`}
            tokens={gallery3Tokens}
            allTokens={tokens}
          />
        );

        galleries.push(
          <Gallery4
            address={address}
            key={`gallery4-${chunk}`}
            tokens={gallery4Tokens}
            allTokens={tokens}
          />
        );
      } else {
        // Create fixed-size arrays for each gallery section


        const gallery3Tokens = tokens.slice(startIndex, startIndex + 6).concat(
          Array(6 - Math.min(tokens.slice(startIndex, startIndex + 6).length, 6)).fill(null)
        );
        const gallery4Tokens = tokens.slice(startIndex + 6, startIndex + 12).concat(
          Array(6 - Math.min(tokens.slice(startIndex + 6, startIndex + 12).length, 6)).fill(null)
        );
        const gallery1Tokens = tokens.slice(startIndex + 12, startIndex + 15).concat(
          Array(3 - Math.min(tokens.slice(startIndex + 12, startIndex + 15).length, 3)).fill(null)
        );
        const gallery2Tokens = tokens.slice(startIndex + 15, startIndex + 16).concat(
          Array(1 - Math.min(tokens.slice(startIndex + 15, startIndex + 16).length, 1)).fill(null)
        );

        // Always push all galleries with their respective padded tokens
        galleries.push(
          <Gallery3
            address={address}
            key={`gallery3-${chunk}`}
            tokens={gallery3Tokens}
            allTokens={tokens}
          />
        );
        galleries.push(
          <Gallery4
            address={address}
            key={`gallery4-${chunk}`}
            tokens={gallery4Tokens}
            allTokens={tokens}
          />
        );
        galleries.push(
          <Gallery1
            address={address}
            key={`gallery1-${chunk}`}
            tokens={gallery1Tokens}
            allTokens={tokens}
          />
        );
        galleries.push(
          <Gallery2
            address={address}
            key={`gallery2-${chunk}`}
            tokens={gallery2Tokens}
            allTokens={tokens}
          />
        );
      }
    }

    return galleries;
  };

  const loadMore = () => {
    if (hasMore) {
      setPage((prevPage) => prevPage + 1);
    }
  };

  return (
    <div className="px-4 md:px-24 mx-auto">
      <div className="grid grid-cols-5 md:grid-cols-10 gap-2 md:gap-3">
        {renderGallery(tokens)}
      </div>
      {loading && (
        <div className="my-6 text-center flex items-center justify-center">
          <Loading />
        </div>
      )}
      {tokens.length > 0 && hasMore && !loading && (
        <div className="mt-5 text-center">
          <button
            onClick={loadMore}
            className="text-[13px] text-gray-400 hover:text-white"
          >
            Load More ...
          </button>
        </div>
      )}
    </div>
  );
}