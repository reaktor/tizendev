import org.tizen.common.util.CipherUtil;

public class Decrypter {
    public static void main(String[] args) throws Exception{
        String password = CipherUtil.getDecryptedString(args[0]);
        System.out.println(password);
    }
}

