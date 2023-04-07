import styles from '../styles/Home.module.css';
import { WalletConnectButton } from '../components/wallet-connect-button';
import { UserCard } from '../components/user-card';
import type { GetStaticProps, GetStaticPropsContext, GetStaticPropsResult, NextPageContext,  NextPage, GetServerSidePropsContext } from 'next';
import type { QueryKey } from 'react-query';
import { QueryClient, hashQueryKey } from 'react-query';


type QueryPropsDefault = unknown | undefined;
type Fetcher<Data = any, QueryProps = QueryPropsDefault> = (
  ctx: NextPageContext | GetServerSidePropsContext | GetStaticPropsContext,
  queryProps?: QueryProps,
  queryClient?: QueryClient
) => Promise<Data> | Data;
type GetQueryKey<QueryProps = QueryPropsDefault> = (
  ctx: NextPageContext | GetServerSidePropsContext | GetStaticPropsContext,
  queryProps?: QueryProps,
  queryClient?: QueryClient
) => QueryKey | Promise<QueryKey | undefined> | undefined;
type QueryPropsGetter<QueryProps> = (
  context: NextPageContext | GetServerSidePropsContext | GetStaticPropsContext,
  queryClient: QueryClient
) => QueryProps | Promise<QueryProps>;
type Query<QueryProps = QueryPropsDefault> = [
  queryKey: GetQueryKey<QueryProps> | QueryKey | undefined,
  fetcher: Fetcher<any, QueryProps>
];
type Queries<QueryProps = QueryPropsDefault> = Readonly<Query<QueryProps>>[];
type GetQueries<QueryProps = QueryPropsDefault> = (
  ctx: NextPageContext | GetServerSidePropsContext | GetStaticPropsContext,
  queryProps?: QueryProps,
  queryClient?: QueryClient
) => Queries<QueryProps> | Promise<Queries<QueryProps>> | null;
interface GetInitialPropsFromQueriesOptions<QueryProps> {
  getQueries: GetQueries<QueryProps> | Queries<QueryProps>;
  ctx: NextPageContext | GetServerSidePropsContext | GetStaticPropsContext;
  getQueryProps?: QueryPropsGetter<QueryProps>;
  queryClient: QueryClient;
}
const IS_DEV = true;

function makeMessage(message: string) {
  return `[jotai-query-toolkit] ${message}`;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      cacheTime: 1000 * 60 * 60 * 12, // 12 hours
      notifyOnChangeProps: ['data', 'error'],
    },
  },
});

function getSingleCachedQueryData<Data = unknown>(
  queryKey: QueryKey,
  queryClient: QueryClient
): Data | undefined {
  const cache = queryClient.getQueryCache();
  const queries = cache.getAll();
  const hashedQueryKey = hashQueryKey(queryKey);
  const match = queries.find(query => query.queryHash === hashedQueryKey);
  if (match) return match?.state.data as Data;
  return undefined;
}

function getCachedQueryData(queryKeys: QueryKey[], queryClient: QueryClient) {
  const found: Record<string, any> = {};
  queryKeys.forEach(queryKey => {
    const match = getSingleCachedQueryData(queryKey, queryClient);
    if (match) found[hashQueryKey(queryKey)] = match;
  });
  if (Object.keys(found).length) return found;
}

async function getInitialPropsFromQueries<QueryProps = QueryPropsDefault>(
  options: GetInitialPropsFromQueriesOptions<QueryProps>
) {
  try {
    const { getQueries, ctx, getQueryProps, queryClient } = options;

    const queryProps: QueryProps | undefined = getQueryProps
      ? await getQueryProps(ctx, queryClient)
      : undefined;

    const getQueryKey = (queryKey: GetQueryKey<QueryProps> | QueryKey) => {
      if (typeof queryKey === 'function') return queryKey(ctx, queryProps, queryClient);
      return queryKey;
    };

    const _queries =
      typeof getQueries === 'function'
        ? await getQueries(ctx, queryProps, queryClient)
        : getQueries;

    if (!_queries) return {};

    const queries = (
      await Promise.all(
        _queries
          .filter(([queryKey]) => !!queryKey)
          .map(async ([queryKey, fetcher]) => [await getQueryKey(queryKey!), fetcher])
      )
    ).filter(([queryKey]) => queryKey) as [QueryKey, Fetcher<QueryProps>][];
    // let's extract only the query keys
    const queryKeys = queries.map(([queryKey]) => queryKey);

    if (queryKeys.length === 0) {
      if (IS_DEV) console.error(makeMessage('getInitialPropsFromQueries -> no query keys'));
      return {};
    }

    // see if we have any cached in the query client
    const data = getCachedQueryData(queryKeys, queryClient) || {};
    const dataKeys = Object.keys(data);
    const allArgsAreCached = dataKeys.length === queries.length;
    // everything is cached, let's return it now
    if (allArgsAreCached) return data;
    // some or none of the args weren't available, as such we need to fetch them
    const results = await Promise.all(
      queries
        // filter the items away that are already cached
        .filter(([queryKey]) => {
          const valueExists = !!data[hashQueryKey(queryKey)];
          return !valueExists;
        })
        // map through and fetch the data for each
        .map(async ([queryKey, fetcher]) => {
          const value = await fetcher(ctx, queryProps, queryClient);
          return [queryKey, value] as [QueryKey, typeof value];
        })
    );

    results.forEach(([queryKey, result]) => {
      // add them to the data object
      data[hashQueryKey(queryKey)] = result;
    });
    // and return them!
    return data;
  } catch (e: any) {
    if (IS_DEV) console.error(makeMessage(e?.message as string));
    return {
      error: true,
      message: e.message,
    };
  }
}

function getStaticQueryProps<QueryProps = undefined, PageProps extends { [key: string]: any; } = any>(
  getQueries: Queries<QueryProps> | GetQueries<QueryProps>,
  getQueryProps?: QueryPropsGetter<QueryProps>
) {
  return (getStaticProps?: GetStaticProps<PageProps>) => {
    return async (ctx: GetStaticPropsContext): Promise<GetStaticPropsResult<PageProps>> => {
      const _getStaticProps = async () => {
        if (getStaticProps) return getStaticProps(ctx);
        return { props: {} };
      };

      const promises: Promise<any>[] = [
        getInitialPropsFromQueries<QueryProps>({
          getQueries,
          getQueryProps,
          ctx,
          queryClient,
        }),
        _getStaticProps(),
      ];

      const [initialQueryData, staticProps] = await Promise.all(promises);

      return {
        ...staticProps,
        props: {
          ...staticProps.props,
          initialQueryData,
        },
      };
    };
  };
}

const getQueries: GetQueries = () => [];

// enable SSG
export const getStaticProps = getStaticQueryProps(getQueries)(async _ctx => {
  return { props: {}, revalidate: 6000 };
});

const Home: NextPage = () => {
  return (
    <div className={styles.container}>
      <main className={styles.main}>
        <h1 className={styles.title}>
          Welcome to <a href="https://nextjs.org">Next.js!</a>
        </h1>
        <UserCard />
        <WalletConnectButton />
      </main>
    </div>
  );
};

export default Home;
