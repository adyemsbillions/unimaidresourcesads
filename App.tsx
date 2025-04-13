import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  ActivityIndicator,
  BackHandler,
  StyleSheet,
  PermissionsAndroid,
  Platform,
  Alert,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
} from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { WebView, WebViewNavigation } from 'react-native-webview';
import {
  InterstitialAd,
  AdEventType,
  BannerAd,
  BannerAdSize,
  MobileAds,
} from 'react-native-google-mobile-ads';

// ✅ Real AdMob unit IDs
const interstitialUnitId = 'ca-app-pub-8822060341834022/1963644004';
const bannerUnitId = 'ca-app-pub-8822060341834022/8240730325';

// ✅ Time control for interstitial ads
let lastAdTime: number | null = null;

export default function App() {
  const [showWebView, setShowWebView] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [canGoBack, setCanGoBack] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isConnected, setIsConnected] = useState(true);

  const webViewRef = useRef<WebView>(null);

  const interstitialRef = useRef(
    InterstitialAd.createForAdRequest(interstitialUnitId, {
      requestNonPersonalizedAdsOnly: true,
    })
  );

  useEffect(() => {
    const unsubscribeNetInfo = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected ?? true);
    });

    const initializeApp = async () => {
      try {
        if (Platform.OS === 'android') {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
            {
              title: 'External Storage Permission',
              message: 'App needs access to your storage',
              buttonNeutral: 'Ask Me Later',
              buttonNegative: 'Cancel',
              buttonPositive: 'OK',
            }
          );
          console.log(
            granted === PermissionsAndroid.RESULTS.GRANTED
              ? '✅ Storage permission granted'
              : '❌ Storage permission denied'
          );
        }

        await MobileAds().initialize();
        interstitialRef.current.load();
      } catch (err) {
        console.warn(err);
      }
    };

    initializeApp();

    return () => {
      unsubscribeNetInfo();
    };
  }, []);

  useEffect(() => {
    const unsubscribe = interstitialRef.current.addAdEventListener(
      AdEventType.LOADED,
      () => {
        const now = Date.now();
        if (!lastAdTime || now - lastAdTime >= 5 * 60 * 1000) {
          console.log('✅ Showing interstitial ad');
          interstitialRef.current.show();
          lastAdTime = now;
        } else {
          console.log('🕒 Interstitial skipped, not enough time passed');
          setShowWebView(true);
          setIsLoading(false);
        }
      }
    );

    const unsubscribeClose = interstitialRef.current.addAdEventListener(
      AdEventType.CLOSED,
      () => {
        console.log('✅ Interstitial ad closed');
        setShowWebView(true);
        setIsLoading(false);
        interstitialRef.current.load(); // Preload next
      }
    );

    return () => {
      unsubscribe();
      unsubscribeClose();
    };
  }, []);

  useEffect(() => {
    const backAction = () => {
      if (showWebView && webViewRef.current && canGoBack) {
        webViewRef.current.goBack();
        return true;
      } else {
        Alert.alert(
          'Exit App',
          'Are you sure you want to exit the app?',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Exit', onPress: () => BackHandler.exitApp() },
          ],
          { cancelable: true }
        );
        return true;
      }
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );

    return () => backHandler.remove();
  }, [showWebView, canGoBack]);

  const handleNavigationStateChange = (navState: WebViewNavigation) => {
    setCanGoBack(navState.canGoBack);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    webViewRef.current?.reload();
    setTimeout(() => setRefreshing(false), 1000);
  };

  return (
    <View style={styles.container}>
      {showWebView ? (
        isConnected ? (
          <>
            {isLoading && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color="#7851A9" />
              </View>
            )}
            <WebView
              ref={webViewRef}
              source={{ uri: 'https://unimaidresources.com.ng' }}
              style={styles.webview}
              onLoadStart={() => setIsLoading(true)}
              onLoadEnd={() => setIsLoading(false)}
              onError={(syntheticEvent) => {
                const { nativeEvent } = syntheticEvent;
                console.warn('WebView error: ', nativeEvent);
                setIsLoading(false);
              }}
              onNavigationStateChange={handleNavigationStateChange}
              pullToRefreshEnabled={true} // ✅ enable native pull to refresh
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
              }
            />
          </>
        ) : (
          <ScrollView
            contentContainerStyle={styles.offlineContainer}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
            }
          >
            <Text style={styles.offlineText}>No Internet Connection</Text>
            <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </ScrollView>
        )
      ) : null}

      {/* ✅ Banner ad at the bottom */}
      <View style={styles.bannerContainer}>
        <BannerAd
          unitId={bannerUnitId}
          size={BannerAdSize.FULL_BANNER}
          requestOptions={{
            requestNonPersonalizedAdsOnly: true,
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  webview: { flex: 1 },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'black',
  },
  bannerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
  },
  offlineContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  offlineText: {
    fontSize: 18,
    marginBottom: 20,
    color: 'black',
  },
  retryButton: {
    backgroundColor: '#7851A9',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
