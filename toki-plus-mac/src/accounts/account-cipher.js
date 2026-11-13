'use strict';

const crypto = require('crypto');
const zlib = require('zlib');

// Khóa bí mật nội bộ độc quyền của Motion Toki
const MASTER_SECRET = crypto.createHash('sha256').update('MOTION_TOKI_EXCLUSIVE_VIP_CIPHER_2026@#!').digest();
const COMPACT_PREFIX = 'TOKI-';
const LEGACY_PREFIX = 'TOKI_';

/**
 * Chuẩn hóa API Key thô (xóa khoảng trắng, dấu nháy, dấu phẩy, đưa hex về chữ thường)
 * @param {string} rawKey 
 * @returns {string}
 */
function normalizeApiKey(rawKey) {
  if (!rawKey || typeof rawKey !== 'string') return '';
  let clean = rawKey.replace(/^[",'\s]+|[",'\s]+$/g, '').split(',')[0].trim();
  if (/^[0-9a-fA-F]{32}$/.test(clean)) {
    clean = clean.toLowerCase();
  }
  return clean;
}

/**
 * Mã hóa API Key gốc thành dạng ngắn gọn (Chỉ ~37 ký tự, dạng License Key)
 * Áp dụng Deterministic IV (IV xác định dựa trên HMAC của API Key):
 * ĐẢM BẢO CÙNG 1 API KEY GỐC LUÔN CHO RA DUY NHẤT 1 CHUỖI MÃ HÓA DUY NHẤT!
 * Không bao giờ bị sinh ra 2 mã khác nhau cho cùng 1 key gốc.
 * 
 * @param {string} rawKey - API key thô (ví dụ: de5c1b1192f648e4871b1bf62ddd6378)
 * @returns {string} - Chuỗi mã hóa siêu ngắn gọn (ví dụ: TOKI-dTERoxYco8OTJ_c...)
 */
function encryptApiKey(rawKey) {
  if (!rawKey || typeof rawKey !== 'string') return '';
  const cleanKey = normalizeApiKey(rawKey);
  if (!cleanKey) return '';

  // Nếu là chuỗi hex 32 ký tự của RunningHub, nén về 16 byte nhị phân để rút ngắn tối đa
  let rawBuf;
  if (/^[0-9a-fA-F]{32}$/.test(cleanKey)) {
    rawBuf = Buffer.from(cleanKey, 'hex');
  } else {
    rawBuf = Buffer.from(cleanKey, 'utf8');
  }

  // IV xác định được dẫn xuất an toàn từ chính nội dung key và MASTER_SECRET
  // Đảm bảo tính nhất quán (deterministic) và chống trùng lặp mã hóa
  const iv = crypto.createHmac('sha256', MASTER_SECRET).update(rawBuf).digest().slice(0, 4);
  const cipherKey = crypto.createHash('sha256').update(Buffer.concat([MASTER_SECRET, iv])).digest();
  const cipher = crypto.createCipheriv('aes-256-ctr', cipherKey, Buffer.alloc(16));
  const encrypted = Buffer.concat([cipher.update(rawBuf), cipher.final()]);

  // HMAC 4 bytes để chống làm giả hoặc chỉnh sửa mã
  const hmac = crypto.createHmac('sha256', MASTER_SECRET).update(Buffer.concat([iv, encrypted])).digest().slice(0, 4);
  const packed = Buffer.concat([iv, hmac, encrypted]);

  return `${COMPACT_PREFIX}${packed.toString('base64url')}`;
}

/**
 * Giải mã chuỗi mã hóa trở lại API Key gốc
 * Hỗ trợ cả định dạng ngắn gọn mới (TOKI-) và định dạng cũ (TOKI_)
 * @param {string} encryptedStr - Chuỗi mã hóa
 * @returns {string|null} - API key gốc hoặc null nếu không hợp lệ
 */
function decryptApiKey(encryptedStr) {
  if (!encryptedStr || typeof encryptedStr !== 'string') return null;
  const str = encryptedStr.trim();

  // 1. Giải mã định dạng ngắn gọn mới (TOKI-...)
  if (str.startsWith(COMPACT_PREFIX)) {
    try {
      const packed = Buffer.from(str.slice(COMPACT_PREFIX.length), 'base64url');
      if (packed.length < 8) return null;

      const iv = packed.slice(0, 4);
      const hmac = packed.slice(4, 8);
      const encrypted = packed.slice(8);

      const expectedHmac = crypto.createHmac('sha256', MASTER_SECRET).update(Buffer.concat([iv, encrypted])).digest().slice(0, 4);
      if (!crypto.timingSafeEqual(hmac, expectedHmac)) return null;

      const cipherKey = crypto.createHash('sha256').update(Buffer.concat([MASTER_SECRET, iv])).digest();
      const decipher = crypto.createDecipheriv('aes-256-ctr', cipherKey, Buffer.alloc(16));
      const rawBuf = Buffer.concat([decipher.update(encrypted), decipher.final()]);

      if (rawBuf.length === 16) {
        return rawBuf.toString('hex');
      }
      return rawBuf.toString('utf8');
    } catch (e) {
      return null;
    }
  }

  // 2. Giải mã định dạng dự phòng (TOKI_...)
  if (str.startsWith(LEGACY_PREFIX)) {
    const parts = str.slice(LEGACY_PREFIX.length).split('_');
    if (parts.length === 3) {
      const [ivHex, tagHex, cipherHex] = parts;
      try {
        const iv = Buffer.from(ivHex, 'hex');
        const tag = Buffer.from(tagHex, 'hex');
        const decipher = crypto.createDecipheriv('aes-256-gcm', MASTER_SECRET, iv);
        decipher.setAuthTag(tag);
        let decrypted = decipher.update(cipherHex, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted.trim();
      } catch (err) {
        return null;
      }
    }
  }

  return null;
}

/**
 * Kiểm tra xem chuỗi có phải là mã hợp lệ đã qua mã hóa của Motion Toki hay không
 */
function isValidEncryptedKey(str) {
  return decryptApiKey(str) !== null;
}


const KNOWN_EMAIL_CASE_MAP = {"calandrasias853@hotmail.com":"CalandraSias853@hotmail.com","mckimleyjozsa0273@hotmail.com":"MckimleyJozsa0273@hotmail.com","eglintonschoenleber833@hotmail.com":"EglintonSchoenleber833@hotmail.com","lilylizer9271@hotmail.com":"LilyLizer9271@hotmail.com","louriapense31@hotmail.com":"LouriaPense31@hotmail.com","kujaklawe64@hotmail.com":"KujakLawe64@hotmail.com","tanskiturber7960@hotmail.com":"TanskiTurber7960@hotmail.com","mattasminick5450@hotmail.com":"MattasMinick5450@hotmail.com","tochersiskind588@hotmail.com":"TocherSiskind588@hotmail.com","behannacorazza9474@hotmail.com":"BehannaCorazza9474@hotmail.com","nuthbernier826@hotmail.com":"NuthBernier826@hotmail.com","ruggabuttrey385@hotmail.com":"RuggaButtrey385@hotmail.com","wakefordlinehan1613@hotmail.com":"WakefordLinehan1613@hotmail.com","sotospaul374@hotmail.com":"SotosPaul374@hotmail.com","briedesloup91@hotmail.com":"BriedeSloup91@hotmail.com","shivleylieu64@hotmail.com":"ShivleyLieu64@hotmail.com","saffelraddle69@hotmail.com":"SaffelRaddle69@hotmail.com","luptakvellutini3326@hotmail.com":"LuptakVellutini3326@hotmail.com","lamonisolda70@hotmail.com":"LamonIsolda70@hotmail.com","janneygillstrap94@hotmail.com":"JanneyGillstrap94@hotmail.com","tanzoschwaltersdorf9754@hotmail.com":"TanzoschWaltersdorf9754@hotmail.com","shreevegirst965@hotmail.com":"ShreeveGirst965@hotmail.com","aldarondoeisenhart101@hotmail.com":"AldarondoEisenhart101@hotmail.com","kubaschcovington5737@hotmail.com":"KubaschCovington5737@hotmail.com","husaintrench508@hotmail.com":"HusainTrench508@hotmail.com","tuellerstrawberry40@hotmail.com":"TuellerStrawberry40@hotmail.com","gildajewel37@hotmail.com":"GildaJewel37@hotmail.com","voddermartines22@hotmail.com":"VodderMartines22@hotmail.com","ashalintubbimccartin6916@hotmail.com":"AshalintubbiMccartin6916@hotmail.com","palchettiruyz3131@hotmail.com":"PalchettiRuyz3131@hotmail.com","lucionse393@hotmail.com":"LucionSe393@hotmail.com","michalskiwinget61@hotmail.com":"MichalskiWinget61@hotmail.com","vigoderoven942@hotmail.com":"VigoDeroven942@hotmail.com","martorellaerts33@hotmail.com":"MartorellAerts33@hotmail.com","semprinicarlie37@hotmail.com":"SempriniCarlie37@hotmail.com","easterbrooksnegro196@hotmail.com":"EasterbrooksNegro196@hotmail.com","zapfdenet47@hotmail.com":"ZapfDenet47@hotmail.com","gilhousenfassnacht9635@hotmail.com":"GilhousenFassnacht9635@hotmail.com","labbadiatiffani2467@hotmail.com":"LabbadiaTiffani2467@hotmail.com","winkfieldelmblad35@hotmail.com":"WinkfieldElmblad35@hotmail.com","soukkhavongblassingame54@hotmail.com":"SoukkhavongBlassingame54@hotmail.com","buderwachsman5720@hotmail.com":"BuderWachsman5720@hotmail.com","minnifieldcabiltes855@hotmail.com":"MinnifieldCabiltes855@hotmail.com","pratleypanton314@hotmail.com":"PratleyPanton314@hotmail.com","vandebogartcobarrubias84@hotmail.com":"VandebogartCobarrubias84@hotmail.com","oborneelicia22@hotmail.com":"OborneElicia22@hotmail.com","saultpearl008@hotmail.com":"SaultPearl008@hotmail.com","stholeoka944@hotmail.com":"StholeOka944@hotmail.com","lajauniekowalczyk203@hotmail.com":"LajaunieKowalczyk203@hotmail.com","hynumdevan905@hotmail.com":"HynumDevan905@hotmail.com","edginlagory2205@hotmail.com":"EdginLagory2205@hotmail.com","chiaclover0218@hotmail.com":"ChiaClover0218@hotmail.com","kreuzigeriner3376@hotmail.com":"KreuzigerIner3376@hotmail.com","broegepercival017@hotmail.com":"BroegePercival017@hotmail.com","leutwilergottwald1454@hotmail.com":"LeutwilerGottwald1454@hotmail.com","ridgelmicale438@hotmail.com":"RidgelMicale438@hotmail.com","lipovskytrear102@hotmail.com":"LipovskyTrear102@hotmail.com","georgiannegoldthorpe01@hotmail.com":"GeorgianneGoldthorpe01@hotmail.com","postiertodor4479@hotmail.com":"PostierTodor4479@hotmail.com","suddothunrath6651@hotmail.com":"SuddothUnrath6651@hotmail.com","singlekinnick41@hotmail.com":"SingleKinnick41@hotmail.com","spanelopilato095@hotmail.com":"SpaneLopilato095@hotmail.com","flandcurey310@hotmail.com":"FlandCurey310@hotmail.com","servillekaniewski18101975bawl@hotmail.com":"ServilleKaniewski18101975bawl@hotmail.com","mceaddyelmer0808@hotmail.com":"MceaddyElmer0808@hotmail.com","donaldsonandre7229@hotmail.com":"DonaldsonAndre7229@hotmail.com","naberssaunder3765@hotmail.com":"NabersSaunder3765@hotmail.com","rollysonvillarrvel90@hotmail.com":"RollysonVillarrvel90@hotmail.com","batzliwetzell32@hotmail.com":"BatzliWetzell32@hotmail.com","quakraebel1371@hotmail.com":"QuaKraebel1371@hotmail.com","rediferluckinbill0561@hotmail.com":"RediferLuckinbill0561@hotmail.com","walezakoriol19111998iw@hotmail.com":"WalezakOriol19111998iw@hotmail.com","commerkuakini4610@hotmail.com":"CommerKuakini4610@hotmail.com","boylyongue4293@hotmail.com":"BoylYongue4293@hotmail.com","gushimulloy18@hotmail.com":"GushiMulloy18@hotmail.com","oberhauskurokawa4551@hotmail.com":"OberhausKurokawa4551@hotmail.com","iidaekman46@hotmail.com":"IidaEkman46@hotmail.com","lannomteske1534@hotmail.com":"LannomTeske1534@hotmail.com","crnichmontemayor81@hotmail.com":"CrnichMontemayor81@hotmail.com","buechelhermandez424@hotmail.com":"BuechelHermandez424@hotmail.com","burgundytontarski757@hotmail.com":"BurgundyTontarski757@hotmail.com","wersalbachman38@hotmail.com":"WersalBachman38@hotmail.com","harlowrylant49@hotmail.com":"HarlowRylant49@hotmail.com","menitzvogler926@hotmail.com":"MenitzVogler926@hotmail.com","larottakeipe64@hotmail.com":"LarottaKeipe64@hotmail.com","wintersteinleh34@hotmail.com":"WintersteinLeh34@hotmail.com","gromanloggins6824@hotmail.com":"GromanLoggins6824@hotmail.com","matthewsditucci98@hotmail.com":"MatthewsDitucci98@hotmail.com","sorrowfulsteigerwalt814@hotmail.com":"SorrowfulSteigerwalt814@hotmail.com","whorleyesper0447@hotmail.com":"WhorleyEsper0447@hotmail.com","willfordholaway212@hotmail.com":"WillfordHolaway212@hotmail.com","guillaumeboron1940@hotmail.com":"GuillaumeBoron1940@hotmail.com","manzdahlke502@hotmail.com":"ManzDahlke502@hotmail.com","butenhoffhabben097@hotmail.com":"ButenhoffHabben097@hotmail.com","medawarsamit49@hotmail.com":"MedawarSamit49@hotmail.com","gaggletcher43@hotmail.com":"GaggLetcher43@hotmail.com","lowlerwaymer4160@hotmail.com":"LowlerWaymer4160@hotmail.com","ortmannkostura85@hotmail.com":"OrtmannKostura85@hotmail.com","rolstonparrent56@hotmail.com":"RolstonParrent56@hotmail.com","mustainherbig575@hotmail.com":"MustainHerbig575@hotmail.com","pacharriller77@hotmail.com":"PacharRiller77@hotmail.com","lanzillotonnessen895@hotmail.com":"LanzilloTonnessen895@hotmail.com","islesllorca451@hotmail.com":"IslesLlorca451@hotmail.com","rosenbergerswartzbeck845@hotmail.com":"RosenbergerSwartzbeck845@hotmail.com","hintzekew599@hotmail.com":"HintzeKew599@hotmail.com","ferreyraseright91@hotmail.com":"FerreyraSeright91@hotmail.com","lebahnentin6345@hotmail.com":"LebahnEntin6345@hotmail.com","halatlavongsar462@hotmail.com":"HalatLavongsar462@hotmail.com","brukfree568@hotmail.com":"BrukFree568@hotmail.com","turkmayshambo428@hotmail.com":"TurkmayShambo428@hotmail.com","kinghornraso136@hotmail.com":"KinghornRaso136@hotmail.com","pettigrewkipling13@hotmail.com":"PettigrewKipling13@hotmail.com","hiscockprchlik276@hotmail.com":"HiscockPrchlik276@hotmail.com","mencheseasler75@hotmail.com":"MenchesEasler75@hotmail.com","manolisshirilla038@hotmail.com":"ManolisShirilla038@hotmail.com","catinellacostner6488@hotmail.com":"CatinellaCostner6488@hotmail.com","salingspohr24111981raf@hotmail.com":"SalingSpohr24111981raf@hotmail.com","noahkrapp0393@hotmail.com":"NoahKrapp0393@hotmail.com","jackolatacneau27@hotmail.com":"JackolaTacneau27@hotmail.com","diamandaroland4079@hotmail.com":"DiamandaRoland4079@hotmail.com","difelicelasseson09@hotmail.com":"DifeliceLasseson09@hotmail.com","yamnitzlori61@hotmail.com":"YamnitzLori61@hotmail.com","halmahoenig39@hotmail.com":"HalmaHoenig39@hotmail.com","bendzusblakeley018@hotmail.com":"BendzusBlakeley018@hotmail.com","mccroskeypontbriand14081992srt@hotmail.com":"MccroskeyPontbriand14081992srt@hotmail.com","vanhammevoncile3940@hotmail.com":"VanhammeVoncile3940@hotmail.com","castongvaypribbenow024@hotmail.com":"CastongvayPribbenow024@hotmail.com","maxiedomine65@hotmail.com":"MaxieDomine65@hotmail.com","diedrasmayda98@hotmail.com":"DiedraSmayda98@hotmail.com","emighkovach20@hotmail.com":"EmighKovach20@hotmail.com","berengersurprise49@hotmail.com":"BerengerSurprise49@hotmail.com","carideoguyll4266@hotmail.com":"CarideoGuyll4266@hotmail.com","mianohyacinth56@hotmail.com":"MianoHyacinth56@hotmail.com","nancybuczek1970@hotmail.com":"NancyBuczek1970@hotmail.com","waltripin67@hotmail.com":"WaltripIn67@hotmail.com","manesgibbins54@hotmail.com":"ManesGibbins54@hotmail.com","ondeckfavuzzi0396@hotmail.com":"OndeckFavuzzi0396@hotmail.com","heinigerabate98@hotmail.com":"HeinigerAbate98@hotmail.com","youngsarroyos32@hotmail.com":"YoungsArroyos32@hotmail.com","farnumpirrello56@hotmail.com":"FarnumPirrello56@hotmail.com","halliseyperkoski7717@hotmail.com":"HalliseyPerkoski7717@hotmail.com","manassamerel0658@hotmail.com":"ManassaMerel0658@hotmail.com","elodiadyson379@hotmail.com":"ElodiaDyson379@hotmail.com","haverlyceraos7285@hotmail.com":"HaverlyCeraos7285@hotmail.com","naftzgerworkowski89@hotmail.com":"NaftzgerWorkowski89@hotmail.com","klepferbazata96@hotmail.com":"KlepferBazata96@hotmail.com","kelttdeniz93@hotmail.com":"KelttDeniz93@hotmail.com","odhnerrestuccia4921@hotmail.com":"OdhnerRestuccia4921@hotmail.com","nohshaffren49@hotmail.com":"NohShaffren49@hotmail.com","tessendorffeuerborn92@hotmail.com":"TessendorfFeuerborn92@hotmail.com","borrisleitten7557@hotmail.com":"BorrisLeitten7557@hotmail.com","blowermontelongo6406@hotmail.com":"BlowerMontelongo6406@hotmail.com","irizarybarkan0272@hotmail.com":"IrizaryBarkan0272@hotmail.com","ruskinmynear75@hotmail.com":"RuskinMynear75@hotmail.com","acfallehargrove28@hotmail.com":"AcfalleHargrove28@hotmail.com","evelethworster063@hotmail.com":"EvelethWorster063@hotmail.com","skoczylasduston99@hotmail.com":"SkoczylasDuston99@hotmail.com","malsomsalos1290@hotmail.com":"MalsomSalos1290@hotmail.com","debernarditrimm89@hotmail.com":"DebernardiTrimm89@hotmail.com","eisentennyson81@hotmail.com":"EisenTennyson81@hotmail.com","bassenasson846@hotmail.com":"BasseNasson846@hotmail.com","grundhoeferconely26111996op@hotmail.com":"GrundhoeferConely26111996op@hotmail.com","reinetherington3035@hotmail.com":"ReinEtherington3035@hotmail.com","mcgettiganmarkland54@hotmail.com":"McgettiganMarkland54@hotmail.com","williamsemily8418@hotmail.com":"WilliamsEmily8418@hotmail.com","octaviacagliostro605@hotmail.com":"OctaviaCagliostro605@hotmail.com","szerugg071@hotmail.com":"SzeRugg071@hotmail.com","dumkericcelli7745@hotmail.com":"DumkeRiccelli7745@hotmail.com","neddenriepheingartner89@hotmail.com":"NeddenriepHeingartner89@hotmail.com","wileyoines502@hotmail.com":"WileyOines502@hotmail.com","ambornkrueth167@hotmail.com":"AmbornKrueth167@hotmail.com","brookestiger019@hotmail.com":"BrookeStiger019@hotmail.com","billiczyz5036@hotmail.com":"BilliCzyz5036@hotmail.com","bibbpestano914@hotmail.com":"BibbPestano914@hotmail.com","arnospyres2916@hotmail.com":"ArnoSpyres2916@hotmail.com","pewitthibma616@hotmail.com":"PewittHibma616@hotmail.com","liepinslanita814@hotmail.com":"LiepinsLanita814@hotmail.com","bignallturla2572@hotmail.com":"BignallTurla2572@hotmail.com","sandellagamer51@hotmail.com":"SandellaGamer51@hotmail.com","dreibelbiscubbison9234@hotmail.com":"DreibelbisCubbison9234@hotmail.com","arantcore919@hotmail.com":"ArantCore919@hotmail.com","kollaschcleal2351@hotmail.com":"KollaschCleal2351@hotmail.com","prestonroberton097@hotmail.com":"PrestonRoberton097@hotmail.com","stachurskibern3741@hotmail.com":"StachurskiBern3741@hotmail.com","hernanandreula10111990lmza@hotmail.com":"HernanAndreula10111990lmza@hotmail.com","canneypoalino002@hotmail.com":"CanneyPoalino002@hotmail.com","steltzershareef39@hotmail.com":"SteltzerShareef39@hotmail.com","mcclamphomphithak711@hotmail.com":"McclamPhomphithak711@hotmail.com","stjacquesblatter26@hotmail.com":"StjacquesBlatter26@hotmail.com","bellincodner15@hotmail.com":"BellinCodner15@hotmail.com","elybessemer761@hotmail.com":"ElyBessemer761@hotmail.com","muradlundi83@hotmail.com":"MuradLundi83@hotmail.com","ditzlerrhyan3340@hotmail.com":"DitzlerRhyan3340@hotmail.com","bonsalldimuccio263@hotmail.com":"BonsallDimuccio263@hotmail.com","mittigamillner949@hotmail.com":"MittigaMillner949@hotmail.com","schwadronromelia5809@hotmail.com":"SchwadronRomelia5809@hotmail.com","burchfielddearmond91@hotmail.com":"BurchfieldDearmond91@hotmail.com","favromorasca3386@hotmail.com":"FavroMorasca3386@hotmail.com","kenziewaltos4685@hotmail.com":"KenzieWaltos4685@hotmail.com","kazemiguler9092@hotmail.com":"KazemiGuler9092@hotmail.com","sigersmcree10@hotmail.com":"SigersMcree10@hotmail.com","rumboldgalban129@hotmail.com":"RumboldGalban129@hotmail.com","barlowkozlowski106@hotmail.com":"BarlowKozlowski106@hotmail.com","cobournhainey816@hotmail.com":"CobournHainey816@hotmail.com","ringlandwainio5955@hotmail.com":"RinglandWainio5955@hotmail.com","horinemontalbano147@hotmail.com":"HorineMontalbano147@hotmail.com","canonlofthouse09@hotmail.com":"CanonLofthouse09@hotmail.com","henkeszwed392@hotmail.com":"HenkeSzwed392@hotmail.com","youngdahlstodola550@hotmail.com":"YoungdahlStodola550@hotmail.com","cabrialesmoye0931@hotmail.com":"CabrialesMoye0931@hotmail.com","valchofickel7321@hotmail.com":"ValchoFickel7321@hotmail.com","vasilopoulostsuchiya4851@hotmail.com":"VasilopoulosTsuchiya4851@hotmail.com","rukavinamihelcic586@hotmail.com":"RukavinaMihelcic586@hotmail.com","traberhoilman20@hotmail.com":"TraberHoilman20@hotmail.com","shaulpremeaux03@hotmail.com":"ShaulPremeaux03@hotmail.com","pyidony249@hotmail.com":"PyIdony249@hotmail.com","moungersweetser2489@hotmail.com":"MoungerSweetser2489@hotmail.com","dainackkimball106@hotmail.com":"DainackKimball106@hotmail.com","ellefsonpoiter8111@hotmail.com":"EllefsonPoiter8111@hotmail.com","folkmanlofaso3704@hotmail.com":"FolkmanLofaso3704@hotmail.com","leannatine6749@hotmail.com":"LeannaTine6749@hotmail.com","korbelschwalenberg579@hotmail.com":"KorbelSchwalenberg579@hotmail.com","hagelcampora4740@hotmail.com":"HagelCampora4740@hotmail.com","joellaminish0405@hotmail.com":"JoellaMinish0405@hotmail.com","bahlmannaspegren3535@hotmail.com":"BahlmannAspegren3535@hotmail.com","lokenkeila9235@hotmail.com":"LokenKeila9235@hotmail.com","nawrockicolclough44@hotmail.com":"NawrockiColclough44@hotmail.com","warrilowcarita17@hotmail.com":"WarrilowCarita17@hotmail.com","petalcularagy39@hotmail.com":"PetalcuLaragy39@hotmail.com","mornadwyer920@hotmail.com":"MornaDwyer920@hotmail.com","blanchcontrino05@hotmail.com":"BlanchContrino05@hotmail.com","sparacinoarmstong4626@hotmail.com":"SparacinoArmstong4626@hotmail.com","kancoldivar98@hotmail.com":"KanColdivar98@hotmail.com","pielochmerati11@hotmail.com":"PielochMerati11@hotmail.com","mansukhanibarsh019@hotmail.com":"MansukhaniBarsh019@hotmail.com","labruyerewarnock8736@hotmail.com":"LabruyereWarnock8736@hotmail.com","gerstenbergershomer4045@hotmail.com":"GerstenbergerShomer4045@hotmail.com","mongepigram7468@hotmail.com":"MongePigram7468@hotmail.com","mangionekapperman0159@hotmail.com":"MangioneKapperman0159@hotmail.com","markevichcrissy523@hotmail.com":"MarkevichCrissy523@hotmail.com","quayhartig819@hotmail.com":"QuayHartig819@hotmail.com","corfmanried08@hotmail.com":"CorfmanRied08@hotmail.com","dziekankalafut386@hotmail.com":"DziekanKalafut386@hotmail.com","glavesbeisel792@hotmail.com":"GlavesBeisel792@hotmail.com","zelinkavarin7155@hotmail.com":"ZelinkaVarin7155@hotmail.com","cheverekamelamela9868@hotmail.com":"ChevereKamelamela9868@hotmail.com","kragerdubberly54@hotmail.com":"KragerDubberly54@hotmail.com","stanbaughwondoloski63@hotmail.com":"StanbaughWondoloski63@hotmail.com","sciallomilnes254@hotmail.com":"ScialloMilnes254@hotmail.com","giottoninicapua260@hotmail.com":"GiottoniniCapua260@hotmail.com","olnickhuling28@hotmail.com":"OlnickHuling28@hotmail.com","balokhirneise99@hotmail.com":"BalokHirneise99@hotmail.com","arkadieestis041@hotmail.com":"ArkadieEstis041@hotmail.com","botkinsdemuzio43@hotmail.com":"BotkinsDemuzio43@hotmail.com","soshnikleto6739@hotmail.com":"SoshnikLeto6739@hotmail.com","tyburskicristina950@hotmail.com":"TyburskiCristina950@hotmail.com","yongalbin577@hotmail.com":"YongAlbin577@hotmail.com","maheuschwaller86@hotmail.com":"MaheuSchwaller86@hotmail.com","garivaysaris4960@hotmail.com":"GarivaySaris4960@hotmail.com","blytherjolanda1469@hotmail.com":"BlytherJolanda1469@hotmail.com","dixonriecke6373@hotmail.com":"DixonRiecke6373@hotmail.com","baxrositano9512@hotmail.com":"BaxRositano9512@hotmail.com","sableaserrata8732@hotmail.com":"SableaSerrata8732@hotmail.com","wilonarorer9709@hotmail.com":"WilonaRorer9709@hotmail.com","derosierlaverette504@hotmail.com":"DerosierLaverette504@hotmail.com","hubertkoonz104@hotmail.com":"HubertKoonz104@hotmail.com","yusiminiuk9566@hotmail.com":"YusiMiniuk9566@hotmail.com","gorenflokrist1498@hotmail.com":"GorenfloKrist1498@hotmail.com","ledeezekria9880@hotmail.com":"LedeeZekria9880@hotmail.com","bigusleis50@hotmail.com":"BigusLeis50@hotmail.com","normanphillipsj87304@outlook.com":"NormanPhillipsJ87304@outlook.com","christopherortiz4i12004t44@outlook.com":"ChristopherOrtiz4I12004t44@outlook.com","williamcontreras078853tv@outlook.com":"WilliamContreras078853tV@outlook.com","samanthakochgg48982ui@outlook.com":"SamanthaKochgG48982UI@outlook.com","erinjohnsonj73748@outlook.com":"ErinJohnsonj73748@outlook.com","robertadixonct86054@outlook.com":"RobertaDixonCt86054@outlook.com","johnacevedomk35625z3x@outlook.com":"JohnAcevedoMK35625Z3X@outlook.com","christopherbrewerkl71887yq@outlook.com":"ChristopherBrewerKl71887yq@outlook.com","isaacgreenh747382n@outlook.com":"IsaacGreenh747382n@outlook.com","seanleed75840p@outlook.com":"SeanLeeD75840p@outlook.com","johndavise63705@outlook.com":"JohnDavisE63705@outlook.com","monicabirdsj56783@outlook.com":"MonicaBirdsJ56783@outlook.com","nathanielpenau27155@outlook.com":"NathanielPenaU27155@outlook.com","stevenfloyds90768b2@outlook.com":"StevenFloyds90768B2@outlook.com","susanrodriguezn75887j5@outlook.com":"SusanRodriguezN75887j5@outlook.com","savannahhendersoncf59212nf2@outlook.com":"SavannahHendersonCf59212nF2@outlook.com","kimberlyturnerm85702@outlook.com":"KimberlyTurnerm85702@outlook.com","andrewchavezi3809@outlook.com":"AndrewChavezI3809@outlook.com","amandabradshawzu32858o@outlook.com":"AmandaBradshawZU32858o@outlook.com","mariagarciaf62794s8@outlook.com":"MariaGarciaf62794S8@outlook.com","davidgardner8v46430@outlook.com":"DavidGardner8v46430@outlook.com","josephmoore2353661@outlook.com":"JosephMoore2353661@outlook.com","rebeccageorge4s20045@outlook.com":"RebeccaGeorge4S20045@outlook.com","annmontgomerypx846847q@outlook.com":"AnnMontgomerypx846847q@outlook.com","zacharyjohnsonj97765rq@outlook.com":"ZacharyJohnsonJ97765rq@outlook.com","juliaholtxt941565y1@outlook.com":"JuliaHoltXt941565Y1@outlook.com","ginabennettb36431@outlook.com":"GinaBennettb36431@outlook.com","josejohnsont189299@outlook.com":"JoseJohnsont189299@outlook.com","jacquelinesnowu85005cf@outlook.com":"JacquelineSnowu85005cF@outlook.com","robertrobinsonn31620s@outlook.com":"RobertRobinsonN31620S@outlook.com","matthewmoores42977efg@outlook.com":"MatthewMoores42977efG@outlook.com","kevinhunterv90987j@outlook.com":"KevinHunterV90987J@outlook.com","williamwilliamsl4493qmu@outlook.com":"WilliamWilliamsL4493qMu@outlook.com","jamiebrownus232603@outlook.com":"JamieBrownUS232603@outlook.com","meganmartinm64288@outlook.com":"MeganMartinM64288@outlook.com","curtislewiso19624xi@outlook.com":"CurtisLewiso19624xI@outlook.com","nathantrevinova20105c8u@outlook.com":"NathanTrevinova20105C8u@outlook.com","vanessanewmany093907rf7@outlook.com":"VanessaNewmany093907Rf7@outlook.com","brianfaulknercx73677p@outlook.com":"BrianFaulknercX73677p@outlook.com","michelehuntop18306we@outlook.com":"MicheleHuntOP18306we@outlook.com","nicholaswaltonh84007q@outlook.com":"NicholasWaltonH84007q@outlook.com","christophermartinez28679u@outlook.com":"ChristopherMartinez28679U@outlook.com","johnedwards0340065py@outlook.com":"JohnEdwards0340065PY@outlook.com","melissarichardsony28659uz0@outlook.com":"MelissaRichardsony28659uz0@outlook.com","bradleyleei33212l@outlook.com":"BradleyLeeI33212l@outlook.com","brandonsalinaskb52600n@outlook.com":"BrandonSalinasKB52600N@outlook.com","alexismooreq7210k@outlook.com":"AlexisMooreq7210k@outlook.com","patriciaglassz803022l@outlook.com":"PatriciaGlassZ803022l@outlook.com","pennyparkercs15077jpv@outlook.com":"PennyParkercs15077jpV@outlook.com","williemedinaj74797f9m@outlook.com":"WillieMedinaj74797F9M@outlook.com","nicolestokesx16071f@outlook.com":"NicoleStokesX16071f@outlook.com","matthewreevesp54033oh@outlook.com":"MatthewReevesP54033oH@outlook.com","samanthadominguezgq62740ux@outlook.com":"SamanthaDominguezGq62740UX@outlook.com","stevenburkex52448@outlook.com":"StevenBurkex52448@outlook.com","tammyrhodesh28023l@outlook.com":"TammyRhodesH28023L@outlook.com","kathyellisdx700477@outlook.com":"KathyEllisDx700477@outlook.com","charlesmedinalp53973k@outlook.com":"CharlesMedinaLP53973K@outlook.com","robertarnoldf18696k9@outlook.com":"RobertArnoldF18696K9@outlook.com","patriciagardnerx56560@outlook.com":"PatriciaGardnerx56560@outlook.com","paigeschwartzu861791a@outlook.com":"PaigeSchwartzu861791a@outlook.com","cristianwrightai38607esm@outlook.com":"CristianWrightAI38607Esm@outlook.com","josemurrayqd21283orn@outlook.com":"JoseMurrayQD21283OrN@outlook.com","elijahcastrox68516@outlook.com":"ElijahCastroX68516@outlook.com","tinagutierreza88611@outlook.com":"TinaGutierrezA88611@outlook.com","emilywilliamsbs49869f@outlook.com":"EmilyWilliamsbS49869F@outlook.com","deborahmannyq48766sd4@outlook.com":"DeborahMannYq48766sD4@outlook.com","lauralopezc12840qij@outlook.com":"LauraLopezc12840QiJ@outlook.com","evelynroweg5820t@outlook.com":"EvelynRoweG5820t@outlook.com","deborahlawrence352365@outlook.com":"DeborahLawrence352365@outlook.com","kristinastephens2851207dly@outlook.com":"KristinaStephens2851207dlY@outlook.com","stevenhickmangn1301g@outlook.com":"StevenHickmangN1301G@outlook.com","christinephammm87385p@outlook.com":"ChristinePhammM87385P@outlook.com","brendanbrownh54170@outlook.com":"BrendanBrownH54170@outlook.com","robertkellyu102679z@outlook.com":"RobertKellyu102679z@outlook.com","kristymorgan72212689@outlook.com":"KristyMorgan72212689@outlook.com","kylemcleank55581@outlook.com":"KyleMcleank55581@outlook.com","allenburkem17755@outlook.com":"AllenBurkeM17755@outlook.com","caitlinmarshall5542038@outlook.com":"CaitlinMarshall5542038@outlook.com","donaldabbottkq78838tx@outlook.com":"DonaldAbbottkQ78838TX@outlook.com","kevinsmithy70657eo@outlook.com":"KevinSmithy70657eO@outlook.com","benjaminbakerh54006s@outlook.com":"BenjaminBakerh54006S@outlook.com","allenholland738321@outlook.com":"AllenHolland738321@outlook.com","lauramontoyam667803u@outlook.com":"LauraMontoyam667803u@outlook.com","valeriehalljl22997px@outlook.com":"ValerieHallJL22997px@outlook.com","bradleylucerouu94678f@outlook.com":"BradleyLucerouU94678f@outlook.com","christinarichardsix85806gs3@outlook.com":"ChristinaRichardsIx85806gs3@outlook.com","matthewgravesd15267s@outlook.com":"MatthewGravesd15267s@outlook.com","josephwilsonj33667d@outlook.com":"JosephWilsonj33667d@outlook.com","edwinpetersonu517993@outlook.com":"EdwinPetersonU517993@outlook.com","melissajohnsonoa2801si@outlook.com":"MelissaJohnsonOa2801Si@outlook.com","wendyolsondh64148a3@outlook.com":"WendyOlsonDH64148a3@outlook.com","victoriajohnsone13231slu@outlook.com":"VictoriaJohnsone13231SLU@outlook.com","danielwatsonig943222@outlook.com":"DanielWatsonIG943222@outlook.com","rebeccasotou87664@outlook.com":"RebeccaSotou87664@outlook.com","amyharrisonvy37185@outlook.com":"AmyHarrisonVy37185@outlook.com","michaelmorsea175962xm@outlook.com":"MichaelMorsea175962xM@outlook.com","michaelelliottp95680@outlook.com":"MichaelElliottp95680@outlook.com","amandamartinh84831lo@outlook.com":"AmandaMartinh84831Lo@outlook.com","howardthomassd20781a9@outlook.com":"HowardThomassd20781a9@outlook.com","robertwalkerjp83924vz@outlook.com":"RobertWalkerjp83924VZ@outlook.com","nathansinghb280190vx@outlook.com":"NathanSinghB280190VX@outlook.com","trevorsmithxc7981i@outlook.com":"TrevorSmithXc7981i@outlook.com","deannacollinso30033j@outlook.com":"DeannaCollinsO30033J@outlook.com","kimberlyandersonxr226741k@outlook.com":"KimberlyAndersonXR226741K@outlook.com","danielledavidsonf11279@outlook.com":"DanielleDavidsonF11279@outlook.com","christinehaydenz36138@outlook.com":"ChristineHaydenZ36138@outlook.com","michaelhessv216877@outlook.com":"MichaelHessV216877@outlook.com","makaylaterrellwx86349d@outlook.com":"MakaylaTerrellWx86349D@outlook.com","jonathonharris0141588at@outlook.com":"JonathonHarris0141588AT@outlook.com","debraguerrerov20192q@outlook.com":"DebraGuerrerov20192q@outlook.com","monicabowmanx02722olk@outlook.com":"MonicaBowmanx02722olk@outlook.com","victoriastricklanddq78889x@outlook.com":"VictoriaStricklanddQ78889x@outlook.com","paulsmall889192w0@outlook.com":"PaulSmall889192w0@outlook.com","michelesmithqp67612d@outlook.com":"MicheleSmithQp67612D@outlook.com","williamramirezo18294rkb@outlook.com":"WilliamRamirezo18294RKB@outlook.com","danasmithc15150hp@outlook.com":"DanaSmithC15150hp@outlook.com","nicoletaylor369664a@outlook.com":"NicoleTaylor369664a@outlook.com","carolinerogerst91010@outlook.com":"CarolineRogersT91010@outlook.com","davidfox9k26268z@outlook.com":"DavidFox9k26268z@outlook.com","matthewjonesj72094vag@outlook.com":"MatthewJonesJ72094vaG@outlook.com","sierraadamsek35129t8@outlook.com":"SierraAdamsEK35129T8@outlook.com","tonywells5166961i@outlook.com":"TonyWells5166961I@outlook.com","jonathanmccoyy79860xfk@outlook.com":"JonathanMccoyY79860XFK@outlook.com","patrickgibsongv24818@outlook.com":"PatrickGibsongV24818@outlook.com","melissabushav47414x@outlook.com":"MelissaBushav47414x@outlook.com","davidbeck4r77925@outlook.com":"DavidBeck4R77925@outlook.com","laurenmcmillans54355x@outlook.com":"LaurenMcmillanS54355X@outlook.com","douglasbarronds81246vw@outlook.com":"DouglasBarronds81246vw@outlook.com","colleenmccormicky41694@outlook.com":"ColleenMccormicky41694@outlook.com","kellygarrisona63539smn@outlook.com":"KellyGarrisonA63539SmN@outlook.com","katieguzman664776tn@outlook.com":"KatieGuzman664776TN@outlook.com","ryanbrowno27128skx@outlook.com":"RyanBrownO27128SKx@outlook.com","micheleclarko36051f@outlook.com":"MicheleClarko36051f@outlook.com","michaelmyersev5864z@outlook.com":"MichaelMyerseV5864Z@outlook.com","patriciasavageku37056@outlook.com":"PatriciaSavageKU37056@outlook.com","lisagarciawz20800t@outlook.com":"LisaGarciaWZ20800t@outlook.com","monicaramirezwj95474@outlook.com":"MonicaRamirezwj95474@outlook.com","stevenwrightg44389m@outlook.com":"StevenWrightG44389M@outlook.com","sarahmosstc47995l5f@outlook.com":"SarahMosstc47995L5f@outlook.com","lauriegarcia551215@outlook.com":"LaurieGarcia551215@outlook.com","stephenmartinezc72088jk9@outlook.com":"StephenMartinezc72088JK9@outlook.com","chadwallacego84450@outlook.com":"ChadWallaceGO84450@outlook.com","kristenthompsonp18429fpl@outlook.com":"KristenThompsonP18429fPL@outlook.com","joshuakleinbe91735cv@outlook.com":"JoshuaKleinBe91735CV@outlook.com","derrickgallegosj62597@outlook.com":"DerrickGallegosJ62597@outlook.com","kimberlyparkseh58004ay@outlook.fr":"KimberlyParksEH58004AY@outlook.fr","brianmorrow62249530z@outlook.fr":"BrianMorrow62249530Z@outlook.fr","ericawilliamscj24326@outlook.fr":"EricaWilliamsCJ24326@outlook.fr","kristinamyersf60078@outlook.fr":"KristinaMyersF60078@outlook.fr","ericramirez143507g3q@outlook.fr":"EricRamirez143507G3Q@outlook.fr","benjaminloweryhn75114vqb@outlook.fr":"BenjaminLoweryhn75114Vqb@outlook.fr","josephthomashp66302gr@outlook.fr":"JosephThomashP66302GR@outlook.fr","matthewmorrisk43808@outlook.fr":"MatthewMorrisk43808@outlook.fr","christinakramerzv59442qn@outlook.fr":"ChristinaKramerZv59442qN@outlook.fr","maryleee92321@outlook.fr":"MaryLeeE92321@outlook.fr","robertwelchgu93174bo@outlook.fr":"RobertWelchGU93174bO@outlook.fr","williamonealt398998@outlook.fr":"WilliamOnealt398998@outlook.fr","joycesmithx44144sx7@outlook.fr":"JoyceSmithx44144Sx7@outlook.fr","lorijenningsqh40471@outlook.fr":"LoriJenningsQh40471@outlook.fr","vanessasmithz48990my@outlook.fr":"VanessaSmithz48990mY@outlook.fr","michaelmooreo7675@outlook.fr":"MichaelMooreO7675@outlook.fr","nathanclayt673396n@outlook.fr":"NathanClayt673396n@outlook.fr","emilysmithnj28446a@outlook.fr":"EmilySmithnJ28446a@outlook.fr","frankgarcia1p98941@outlook.fr":"FrankGarcia1p98941@outlook.fr","jakeharringtons89571z1g@outlook.fr":"JakeHarringtonS89571Z1G@outlook.fr","davidclarkpi27644pie@outlook.fr":"DavidClarkPI27644PIE@outlook.fr","claudiafarleypn54483@outlook.fr":"ClaudiaFarleypN54483@outlook.fr","stevenstephensfy80840a2@outlook.fr":"StevenStephensfY80840a2@outlook.fr","ryanedwardsq864137xo@outlook.fr":"RyanEdwardsQ864137xO@outlook.fr","cassandrahicksyr846203kj@outlook.fr":"CassandraHicksYR846203KJ@outlook.fr","zacharyharrington1r27160jnc@outlook.fr":"ZacharyHarrington1r27160JNc@outlook.fr","kimberlyyoung5x34189w@outlook.fr":"KimberlyYoung5X34189W@outlook.fr","jennifernewman829145@outlook.fr":"JenniferNewman829145@outlook.fr","jamesgreen3187416vn@outlook.fr":"JamesGreen3187416VN@outlook.fr","annbellic61511k@outlook.fr":"AnnBellIC61511K@outlook.fr","samanthaclarkj86691@outlook.fr":"SamanthaClarkJ86691@outlook.fr","emilyyoungk97049@outlook.fr":"EmilyYoungK97049@outlook.fr","bobbyhamiltonpb76732e@outlook.fr":"BobbyHamiltonpB76732E@outlook.fr","bethdaughertyw50500nbl@outlook.fr":"BethDaughertyw50500NBl@outlook.fr","franciscomora9o80608ol@outlook.fr":"FranciscoMora9O80608oL@outlook.fr","jeffreyprattp939877vk@outlook.fr":"JeffreyPrattP939877Vk@outlook.fr","tylermontgomeryqu37745l@outlook.fr":"TylerMontgomeryqu37745L@outlook.fr","andreawelchj72357@outlook.fr":"AndreaWelchJ72357@outlook.fr","nicholasmedinage30140h9@outlook.fr":"NicholasMedinage30140H9@outlook.fr","aaroncisnerosi55101hxi@outlook.fr":"AaronCisnerosI55101hXI@outlook.fr","kayleeperkinsxg66497hi@outlook.fr":"KayleePerkinsXG66497hI@outlook.fr","debramartinez121039@outlook.fr":"DebraMartinez121039@outlook.fr","ericajacksoncs43423m@outlook.fr":"EricaJacksonCS43423M@outlook.fr","stephenshannonzj47578n@outlook.fr":"StephenShannonzJ47578N@outlook.fr","colleenmasonlm71398tyu@outlook.fr":"ColleenMasonLm71398tyu@outlook.fr","carlgrayzy33910@outlook.fr":"CarlGrayzY33910@outlook.fr","kristylozanobq94390@outlook.fr":"KristyLozanobq94390@outlook.fr","carmenbellp933843mx@outlook.fr":"CarmenBellP933843Mx@outlook.fr","daniellestokesrf11144l@outlook.fr":"DanielleStokesrF11144l@outlook.fr","jackmitchelli935614o@outlook.fr":"JackMitchelli935614O@outlook.fr","williamhaynesd28361kl@outlook.fr":"WilliamHaynesD28361kL@outlook.fr","jennifervaldezwv18187@outlook.fr":"JenniferValdezwv18187@outlook.fr","mitchellshepardw30939qi3@outlook.fr":"MitchellShepardW30939QI3@outlook.fr","shanemurphyu9489963@outlook.fr":"ShaneMurphyU9489963@outlook.fr","jeremyblankenshipw5826u@outlook.fr":"JeremyBlankenshipw5826U@outlook.fr","rachelchoi4y50966czz@outlook.fr":"RachelChoi4y50966cZz@outlook.fr","justinsantanaj41076vi6@outlook.fr":"JustinSantanaJ41076Vi6@outlook.fr","michaelwagner7539886n@outlook.fr":"MichaelWagner7539886N@outlook.fr","elizabethgilmore786590wy@outlook.fr":"ElizabethGilmore786590Wy@outlook.fr","jonathansmithnc76905@outlook.fr":"JonathanSmithnc76905@outlook.fr","karenstanleykr51075v@outlook.fr":"KarenStanleykr51075v@outlook.fr","kennethwilsondg23861v@outlook.fr":"KennethWilsonDG23861v@outlook.fr","markhodgesm70969g6h@outlook.fr":"MarkHodgesM70969g6H@outlook.fr","williamwaller350850wo@outlook.fr":"WilliamWaller350850wO@outlook.fr","kennethturner5p60977yo4@outlook.fr":"KennethTurner5p60977YO4@outlook.fr","garycarlson311609@outlook.fr":"GaryCarlson311609@outlook.fr","laurastantone16921y3@outlook.fr":"LauraStantonE16921y3@outlook.fr","brianhodgefu68115@outlook.fr":"BrianHodgefU68115@outlook.fr","edwardnelsong18228jku@outlook.fr":"EdwardNelsong18228jkU@outlook.fr","allisongomezwf29402w54@outlook.fr":"AllisonGomezwF29402W54@outlook.fr","shanegalvans95159wx@outlook.fr":"ShaneGalvanS95159WX@outlook.fr","juancarey193667w4u@outlook.fr":"JuanCarey193667w4U@outlook.fr","nancymoorex539861w@outlook.fr":"NancyMooreX539861W@outlook.fr","jessechaneyh18272hk@outlook.fr":"JesseChaneyH18272hk@outlook.fr","richardduncandw66635d@outlook.fr":"RichardDuncanDw66635D@outlook.fr","paulguerreroiv33767j@outlook.fr":"PaulGuerreroiV33767j@outlook.fr","marvinsanchezo36431o@outlook.fr":"MarvinSanchezO36431o@outlook.fr","jessicasmithge17195@outlook.fr":"JessicaSmithgE17195@outlook.fr","andrewgentry869332rrc@outlook.fr":"AndrewGentry869332rrC@outlook.fr","dianacummingsuq94198@outlook.fr":"DianaCummingsuq94198@outlook.fr","jenniferlewisgm45596@outlook.fr":"JenniferLewisgm45596@outlook.fr","charlenemitchellc72623@outlook.fr":"CharleneMitchellC72623@outlook.fr","masonmorriss445393l@outlook.fr":"MasonMorriss445393L@outlook.fr","dianagardnerz62171rh@outlook.fr":"DianaGardnerz62171rH@outlook.fr","kathryncunningham857831@outlook.fr":"KathrynCunningham857831@outlook.fr","randalltorresk56156kux@outlook.fr":"RandallTorresk56156kux@outlook.fr","stephanierodriguezb221606ybe@outlook.fr":"StephanieRodriguezb221606yBE@outlook.fr","russellsteelej51115q@outlook.fr":"RussellSteeleJ51115Q@outlook.fr","christophermurphya25586bwu@outlook.fr":"ChristopherMurphyA25586bWU@outlook.fr","lisasheppardp88768cm2@outlook.fr":"LisaSheppardp88768Cm2@outlook.fr","leeriveraj18706e@outlook.fr":"LeeRiveraj18706E@outlook.fr","amygravespj17870@outlook.fr":"AmyGravespj17870@outlook.fr","michaelmcintoshw88430a@outlook.fr":"MichaelMcintoshW88430A@outlook.fr","lisawhitele13460@outlook.fr":"LisaWhitele13460@outlook.fr"};
const ACCOUNT_PREFIX = 'TOKI-ACC-';

function extractJwtSub(jwtStr) {
  try {
    const parts = String(jwtStr || '').trim().split('.');
    if (parts.length !== 3) return '';
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    return String(payload.sub || payload.userId || payload.id || '');
  } catch (_) {
    return '';
  }
}

/**
 * Chuẩn hóa thông tin tài khoản (hỗ trợ email|password, email|password|token, hoặc trực tiếp JWT token eyJ...)
 * @param {string|object} raw
 * @returns {{ email: string, password: string, accessToken?: string, refreshToken?: string } | null}
 */
function normalizeAccount(raw) {
  if (!raw) return null;
  let email = '', password = '', accessToken = '', refreshToken = '';
  if (typeof raw === 'object' && raw !== null) {
    email = String(raw.email || raw.username || '').trim();
    password = String(raw.password || '').trim();
    accessToken = String(raw.accessToken || raw.access_token || raw.token || '').trim();
    refreshToken = String(raw.refreshToken || raw.refresh_token || '').trim();
  } else if (typeof raw === 'string') {
    let clean = raw.trim();
    // Hỗ trợ nhập trực tiếp JWT access_token (eyJhbGci...)
    if (/^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(clean)) {
      const sub = extractJwtSub(clean) || crypto.createHash('md5').update(clean).digest('hex').slice(0, 8);
      return {
        email: `rh_${sub.slice(-8)}@runninghub.ai`,
        password: 'TOKEN_AUTH',
        accessToken: clean,
        refreshToken: ''
      };
    }
    if (clean.includes('|')) {
      const parts = clean.split('|').map(s => s.trim());
      email = parts[0] || '';
      if (parts.length >= 3 && /^eyJ[A-Za-z0-9_-]+\./.test(parts[parts.length - 1])) {
        if (parts.length >= 4 && /^eyJ[A-Za-z0-9_-]+\./.test(parts[parts.length - 2])) {
          refreshToken = parts[parts.length - 1];
          accessToken = parts[parts.length - 2];
          password = parts.slice(1, parts.length - 2).join('|');
        } else {
          accessToken = parts[parts.length - 1];
          password = parts.slice(1, parts.length - 1).join('|');
        }
      } else {
        password = parts.slice(1).join('|');
      }
    } else if (clean.includes(':')) {
      const parts = clean.split(':');
      email = parts[0].trim();
      password = parts.slice(1).join(':').trim();
    } else if (clean.includes('\t')) {
      const parts = clean.split('\t');
      email = parts[0].trim();
      password = parts.slice(1).join('\t').trim();
    } else if (/\s+/.test(clean)) {
      const parts = clean.split(/\s+/);
      email = parts[0].trim();
      password = parts.slice(1).join(' ').trim();
    }
  }
  if (!email && accessToken) {
    const sub = extractJwtSub(accessToken) || crypto.createHash('md5').update(accessToken).digest('hex').slice(0, 8);
    email = `rh_${sub.slice(-8)}@runninghub.ai`;
    if (!password) password = 'TOKEN_AUTH';
  }
  if (!email || !password) return null;
  const trimmedEmail = email.trim();
  const out = {
    email: KNOWN_EMAIL_CASE_MAP[trimmedEmail.toLowerCase()] || trimmedEmail,
    password
  };
  if (accessToken) out.accessToken = accessToken;
  if (refreshToken) out.refreshToken = refreshToken;
  return out;
}

/**
 * Mã hóa tài khoản (Email|Password hoặc Email|Password|AccessToken) thành mã bản quyền độc quyền TOKI-ACC-...
 * Sử dụng chuẩn mã hóa quân đội AES-256-GCM kèm Deterministic HMAC IV:
 * ĐẢM BẢO: Cùng 1 tài khoản luôn sinh ra cùng 1 chuỗi mã hóa để tự động lọc trùng!
 * 
 * @param {string|object} raw - email|password hoặc object { email, password, accessToken }
 * @returns {string|null} - Chuỗi mã hóa (ví dụ: TOKI-ACC-NffTFCqWca0Y-...)
 */
function packCompactJwt(token) {
  try {
    const parts = String(token || '').trim().split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    const sigBuf = Buffer.from(parts[2], 'base64url');
    if (!payload.sub || !payload.username || payload.username.length !== 32) return null;

    const bSub = BigInt(payload.sub);
    const bEpoch = BigInt(payload.epoch || 0);
    const bExp = Number(payload.exp || 0);
    const bCreated = BigInt(payload.created || 0);
    const bUsernameHex = Buffer.from(payload.username, 'hex');

    const buf = Buffer.alloc(8 + 8 + 4 + 8 + 16 + 1);
    buf.writeBigUInt64BE(bSub, 0);
    buf.writeBigUInt64BE(bEpoch, 8);
    buf.writeUInt32BE(bExp, 16);
    buf.writeBigUInt64BE(bCreated, 20);
    bUsernameHex.copy(buf, 28);
    buf.writeUInt8(payload.userRegion === 'zh_CN' ? 0 : 1, 44);
    return Buffer.concat([buf, sigBuf]);
  } catch (_) {
    return null;
  }
}

function unpackCompactJwt(rawBuf) {
  try {
    if (!rawBuf || rawBuf.length < 45 + 10) return null;
    let off = 0;
    const dSub = rawBuf.readBigUInt64BE(off).toString(); off += 8;
    const dEpoch = Number(rawBuf.readBigUInt64BE(off)); off += 8;
    const dExp = rawBuf.readUInt32BE(off); off += 4;
    const dCreated = Number(rawBuf.readBigUInt64BE(off)); off += 8;
    const dUsername = rawBuf.slice(off, off + 16).toString('hex'); off += 16;
    const dRegion = rawBuf.readUInt8(off++) === 0 ? 'zh_CN' : 'en_US';
    const dSig = rawBuf.slice(off);

    const payloadObj = {
      sub: dSub,
      epoch: dEpoch,
      exp: dExp,
      created: dCreated,
      username: dUsername,
      userRegion: dRegion
    };
    const b64Payload = Buffer.from(JSON.stringify(payloadObj), 'utf8').toString('base64url');
    const b64Sig = dSig.toString('base64url');
    return `eyJhbGciOiJIUzUxMiJ9.${b64Payload}.${b64Sig}`;
  } catch (_) {
    return null;
  }
}

/**
 * Mã hóa tài khoản (Email|Password hoặc Email|Password|AccessToken) thành mã bản quyền độc quyền TOKI-ACC-...
 * Sử dụng chuẩn nén siêu cấp nhị phân CTR/GCM:
 * - Mã chỉ ~210 ký tự (siêu ngắn, gọn gàng, copy dễ dàng)
 * - Chứa trọn vẹn email + password + accessToken 30 ngày (chống 100% lỗi FREQUENT_OPERATIONS)
 * - Tương thích ngược 100% với định dạng cũ và dạng không có token (~89 ký tự)
 * 
 * @param {string|object} raw - email|password hoặc object { email, password, accessToken }
 * @returns {string|null} - Chuỗi mã hóa (ví dụ: TOKI-ACC-Q3n3rWee0XbVJdi...)
 */
function encryptAccount(raw) {
  const norm = normalizeAccount(raw);
  if (!norm) return null;

  // 1. Thử nén siêu cấp dạng nhị phân 0x03 (~210 ký tự)
  if (norm.accessToken && norm.accessToken.startsWith('eyJ')) {
    const compactJwt = packCompactJwt(norm.accessToken);
    if (compactJwt) {
      const emailBuf = Buffer.from(norm.email, 'utf8');
      const passBuf = Buffer.from(norm.password, 'utf8');
      const fullBinary = Buffer.concat([
        Buffer.from([0x03, emailBuf.length]),
        emailBuf,
        Buffer.from([passBuf.length]),
        passBuf,
        compactJwt
      ]);

      const iv = crypto.createHmac('sha256', MASTER_SECRET).update(fullBinary).digest().slice(0, 4);
      const cipherKey = crypto.createHash('sha256').update(Buffer.concat([MASTER_SECRET, iv])).digest();
      const cipher = crypto.createCipheriv('aes-256-ctr', cipherKey, Buffer.alloc(16));
      const enc = Buffer.concat([cipher.update(fullBinary), cipher.final()]);
      const hmac = crypto.createHmac('sha256', MASTER_SECRET).update(Buffer.concat([iv, enc])).digest().slice(0, 4);
      const packed = Buffer.concat([iv, hmac, enc]);
      return `${ACCOUNT_PREFIX}${packed.toString('base64url')}`;
    }
  }

  // 2. Dự phòng dạng Deflate thông thường nếu JWT có cấu trúc khác
  let rawBuf;
  if (norm.accessToken) {
    const parts = [norm.email, norm.password, norm.accessToken];
    const utf8Buf = Buffer.from(parts.join('|'), 'utf8');
    const deflated = zlib.deflateRawSync(utf8Buf, { level: 9 });
    rawBuf = Buffer.concat([Buffer.from([0x00]), deflated]);
  } else {
    rawBuf = Buffer.from(`${norm.email}|${norm.password}`, 'utf8');
  }

  const iv = crypto.createHmac('sha256', MASTER_SECRET).update(rawBuf).digest().slice(0, 12);
  const cipher = crypto.createCipheriv('aes-256-gcm', MASTER_SECRET, iv);
  const enc = Buffer.concat([cipher.update(rawBuf), cipher.final()]);
  const tag = cipher.getAuthTag();
  const packed = Buffer.concat([iv, tag, enc]);
  return `${ACCOUNT_PREFIX}${packed.toString('base64url')}`;
}

/**
 * Giải mã chuỗi TOKI-ACC-... trở lại email, password và accessToken (nếu có nhúng sẵn)
 * Hỗ trợ cả 4 định dạng:
 * 1. Định dạng siêu ngắn gọn nhị phân CTR 0x03 (~210 ký tự)
 * 2. Định dạng nhị phân GCM 0x02 (~380 ký tự)
 * 3. Định dạng Deflate v1 0x00 (~430 ký tự)
 * 4. Định dạng chuỗi thô cơ bản (~89 ký tự)
 * 
 * @param {string} encryptedStr 
 * @returns {{ email: string, password: string, accessToken: string, refreshToken: string, raw: string } | null}
 */
function decryptAccount(encryptedStr) {
  if (!encryptedStr || typeof encryptedStr !== 'string') return null;
  const trimmed = encryptedStr.trim();
  if (/^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(trimmed)) {
    const norm = normalizeAccount(trimmed);
    return norm ? { ...norm, accessToken: norm.accessToken || trimmed, refreshToken: '', raw: `${norm.email}|${norm.password}|${trimmed}` } : null;
  }
  if (!trimmed.startsWith(ACCOUNT_PREFIX)) return null;

  try {
    const packed = Buffer.from(trimmed.slice(ACCOUNT_PREFIX.length), 'base64url');

    // 1. Thử giải mã định dạng siêu ngắn gọn CTR (iv 4B + hmac 4B + enc)
    if (packed.length > 8) {
      try {
        const iv4 = packed.slice(0, 4);
        const hmac4 = packed.slice(4, 8);
        const enc4 = packed.slice(8);
        const expectedHmac = crypto.createHmac('sha256', MASTER_SECRET).update(Buffer.concat([iv4, enc4])).digest().slice(0, 4);
        if (crypto.timingSafeEqual(hmac4, expectedHmac)) {
          const cipherKey = crypto.createHash('sha256').update(Buffer.concat([MASTER_SECRET, iv4])).digest();
          const decipher = crypto.createDecipheriv('aes-256-ctr', cipherKey, Buffer.alloc(16));
          const decBuf = Buffer.concat([decipher.update(enc4), decipher.final()]);

          if (decBuf[0] === 0x03 && decBuf.length >= 48) {
            let off = 1;
            const eLen = decBuf[off++];
            const decEmail = decBuf.slice(off, off + eLen).toString('utf8');
            off += eLen;
            const pLen = decBuf[off++];
            const decPass = decBuf.slice(off, off + pLen).toString('utf8');
            off += pLen;
            const reconstructedToken = unpackCompactJwt(decBuf.slice(off));
            if (reconstructedToken) {
              const fixedEmail = KNOWN_EMAIL_CASE_MAP[decEmail.toLowerCase()] || decEmail;
              return {
                email: fixedEmail,
                password: decPass,
                accessToken: reconstructedToken,
                refreshToken: '',
                raw: `${fixedEmail}|${decPass}|${reconstructedToken}`
              };
            }
          }
        }
      } catch (_) {}
    }

    // 2. Thử giải mã định dạng GCM (12 iv + 16 tag + enc)
    if (packed.length < 29) return null;
    const iv = packed.slice(0, 12);
    const tag = packed.slice(12, 28);
    const enc = packed.slice(28);

    const decipher = crypto.createDecipheriv('aes-256-gcm', MASTER_SECRET, iv);
    decipher.setAuthTag(tag);
    const decBuf = Buffer.concat([decipher.update(enc), decipher.final()]);

    let unpackedBuf = null;
    try { unpackedBuf = zlib.inflateRawSync(decBuf); } catch (_) {}

    if (unpackedBuf && unpackedBuf[0] === 0x02 && unpackedBuf.length >= 6) {
      let off = 1;
      const eLen = unpackedBuf[off++];
      const decEmail = unpackedBuf.slice(off, off + eLen).toString('utf8');
      off += eLen;
      const pLen = unpackedBuf[off++];
      const decPass = unpackedBuf.slice(off, off + pLen).toString('utf8');
      off += pLen;
      const payLen = (unpackedBuf[off] << 8) | unpackedBuf[off + 1];
      off += 2;
      const decPayBuf = unpackedBuf.slice(off, off + payLen);
      off += payLen;
      const decSigBuf = unpackedBuf.slice(off);
      const reconstructedToken = 'eyJhbGciOiJIUzUxMiJ9.' + decPayBuf.toString('base64url') + '.' + decSigBuf.toString('base64url');
      const fixedEmail = KNOWN_EMAIL_CASE_MAP[decEmail.toLowerCase()] || decEmail;
      return {
        email: fixedEmail,
        password: decPass,
        accessToken: reconstructedToken,
        refreshToken: '',
        raw: `${fixedEmail}|${decPass}|${reconstructedToken}`
      };
    }

    let dec = '';
    if (decBuf[0] === 0x00) {
      try { dec = zlib.inflateRawSync(decBuf.slice(1)).toString('utf8'); } catch (_) {}
    }
    if (!dec && unpackedBuf) dec = unpackedBuf.toString('utf8');
    if (!dec) dec = decBuf.toString('utf8');

    const idx = dec.indexOf('|');
    if (idx === -1) return null;
    const parsed = normalizeAccount(dec);
    if (!parsed) {
      const rawEmail = dec.slice(0, idx);
      const fixedEmail = KNOWN_EMAIL_CASE_MAP[rawEmail.toLowerCase()] || rawEmail;
      return {
        email: fixedEmail,
        password: dec.slice(idx + 1),
        accessToken: '',
        refreshToken: '',
        raw: dec
      };
    }
    return {
      email: parsed.email,
      password: parsed.password,
      accessToken: parsed.accessToken || '',
      refreshToken: parsed.refreshToken || '',
      raw: dec
    };
  } catch (e) {
    return null;
  }
}

/**
 * Kiểm tra xem chuỗi có phải là tài khoản mã hóa hợp lệ không
 */
function isValidEncryptedAccount(str) {
  return decryptAccount(str) !== null;
}

const CLOUDFLARE_VAULT_URL = 'https://toki-vault.quangtrandang46.workers.dev';

/**
 * Tạo mã ID ngẫu nhiên hoặc xác định cho Short Key (ví dụ: a8K9xL2m - 8 ký tự)
 */
function generateShortKeyId(seed) {
  if (seed) {
    const hash = crypto.createHmac('sha256', MASTER_SECRET).update(String(seed).toLowerCase().trim()).digest('base64url');
    return hash.slice(0, 8);
  }
  return crypto.randomBytes(6).toString('base64url').slice(0, 8);
}

/**
 * Tải chuỗi mã hóa gốc từ Cloudflare Vault qua Short Code
 * @param {string} shortCode (ví dụ: TOKI-ACC-k8X9pL2m hoặc k8X9pL2m)
 * @returns {Promise<string|null>}
 */
function fetchPayloadFromVault(shortCode) {
  return new Promise((resolve) => {
    if (!shortCode || typeof shortCode !== 'string') return resolve(null);
    let code = shortCode.trim();
    if (code.startsWith(ACCOUNT_PREFIX)) {
      code = code.slice(ACCOUNT_PREFIX.length).trim();
    }
    // Short key chuẩn có độ dài từ 6 đến 16 ký tự chữ số
    if (!/^[a-zA-Z0-9_-]{6,16}$/.test(code)) return resolve(null);

    const https = require('https');
    const req = https.get(`${CLOUDFLARE_VAULT_URL}/${code}`, { timeout: 4000 }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json && json.success && json.payload) {
            resolve(json.payload);
          } else {
            resolve(null);
          }
        } catch (_) {
          resolve(null);
        }
      });
    });
    req.on('error', () => resolve(null));
    req.on('timeout', () => {
      req.destroy();
      resolve(null);
    });
  });
}

/**
 * Đẩy chuỗi mã hóa lên Cloudflare Vault và sinh mã ngắn TOKI-ACC-xxxxxx
 * @param {string} fullEncryptedPayload - Chuỗi mã hóa TOKI-ACC-... đầy đủ
 * @param {string} [idSeed] - Email hoặc chuỗi định danh để tạo mã cố định
 * @returns {Promise<string|null>} - Trả về mã ngắn TOKI-ACC-xxxxxx
 */
function uploadToVault(fullEncryptedPayload, idSeed) {
  return new Promise((resolve, reject) => {
    if (!fullEncryptedPayload) return resolve(null);
    const id = generateShortKeyId(idSeed);
    const postData = JSON.stringify({ id, payload: fullEncryptedPayload });
    const https = require('https');

    const req = https.request(CLOUDFLARE_VAULT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 6000
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json && json.success) {
            resolve(`${ACCOUNT_PREFIX}${id}`);
          } else {
            reject(new Error(json.error || 'Cloudflare KV rejected'));
          }
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', (err) => reject(err));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Cloudflare KV timeout'));
    });
    req.write(postData);
    req.end();
  });
}

/**
 * Giải mã tài khoản bất đồng bộ (hỗ trợ cả Short Code Cloudflare và Offline Code)
 */
async function decryptAccountAsync(str) {
  if (!str || typeof str !== 'string') return null;
  const trimmed = str.trim();
  if (!trimmed.startsWith(ACCOUNT_PREFIX)) return null;

  const code = trimmed.slice(ACCOUNT_PREFIX.length).trim();
  // Nếu là Short Code (độ dài 6-16 ký tự chữ số không phải base64url của gói nén lớn)
  if (/^[a-zA-Z0-9_-]{6,16}$/.test(code)) {
    const fullPayload = await fetchPayloadFromVault(code);
    if (fullPayload) {
      return decryptAccount(fullPayload);
    }
    return null;
  }

  // Nếu là mã nén trực tiếp (~210 ký tự hoặc lớn hơn)
  return decryptAccount(trimmed);
}

module.exports = {
  normalizeApiKey,
  encryptApiKey,
  decryptApiKey,
  isValidEncryptedKey,
  KEY_PREFIX: COMPACT_PREFIX,
  LEGACY_PREFIX,
  // Account cipher
  ACCOUNT_PREFIX,
  ACC_PREFIX: ACCOUNT_PREFIX,
  normalizeAccount,
  encryptAccount,
  decryptAccount,
  decryptAccountAsync,
  fetchPayloadFromVault,
  uploadToVault,
  generateShortKeyId,
  CLOUDFLARE_VAULT_URL,
  isValidEncryptedAccount,
  MASTER_SECRET
};
